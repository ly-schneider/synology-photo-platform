import { redis } from "@/lib/redis";
import { login } from "./auth";
import { getStoredSession, storeSession } from "./sessionStore";
import type { SynologyResponse, SynologySession } from "./types";
import { SynologyApiError } from "./types";

function synoWebApiBase(): string {
  const base = process.env.SYNOLOGY_PHOTO_BASE_URL;
  if (!base) throw new Error("Missing env SYNOLOGY_PHOTO_BASE_URL");
  return base + "/photo/webapi";
}

function entryUrl(): string {
  return synoWebApiBase() + "/entry.cgi";
}

const LOCK_KEY = "synology:session:lock";

async function withLoginLock<T>(fn: () => Promise<T>): Promise<T> {
  const token = crypto.randomUUID();
  const acquired = await redis.set(LOCK_KEY, token, { nx: true, ex: 10 });

  if (!acquired) {
    // Another instance is logging in; wait briefly for session to appear.
    for (let i = 0; i < 20; i++) {
      const s = await getStoredSession();
      if (s) return (await fnUsingExistingSession(fn)) as T;
      await sleep(150);
    }
    // If still nothing, fall through and try anyway.
  }

  try {
    return await fn();
  } finally {
    // Best effort unlock
    await redis.del(LOCK_KEY);
  }
}

async function fnUsingExistingSession<T>(fn: () => Promise<T>): Promise<T> {
  // We already have a session; just run.
  return await fn();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Synology common error codes: session timeout=106, duplicated login=107, invalid session=119,
// source IP mismatch=150, “system busy / network unstable” includes 109/110/111/117/118.
function isSessionError(code: number): boolean {
  return code === 106 || code === 107 || code === 119 || code === 150;
}

function isTransientNetworkError(code: number): boolean {
  return (
    code === 109 || code === 110 || code === 111 || code === 117 || code === 118
  );
}

async function getOrLoginSession(): Promise<SynologySession> {
  const existing = await getStoredSession();
  if (existing?.sid) return existing;

  return await withLoginLock(async () => {
    const again = await getStoredSession();
    if (again?.sid) return again;
    return await login();
  });
}

async function forceRelogin(): Promise<SynologySession> {
  return await withLoginLock(async () => await login());
}

function encodeParamValue(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

type SynoCallOptions = {
  endpoint?: "entry" | "auth";
  method?: "GET" | "POST";
  headers?: HeadersInit;
  // Base Synology params:
  api: string;
  version: number;
  synoMethod: string;
  // Any additional params required by the API call:
  params?: Record<string, unknown>;
  // retries:
  reloginRetries?: number; // default 1
  networkRetries?: number; // default 3
};

export async function synoCallJson<T>(opts: SynoCallOptions): Promise<T> {
  const reloginRetries = opts.reloginRetries ?? 1;
  const networkRetries = opts.networkRetries ?? 3;

  let reloginAttempts = 0;
  let networkAttempts = 0;

  while (true) {
    const session = await getOrLoginSession();

    const url = new URL(entryUrl());
    const q = url.searchParams;

    q.set("api", opts.api);
    q.set("version", String(opts.version));
    q.set("method", opts.synoMethod);
    q.set("_sid", session.sid);

    if (session.synotoken) q.set("SynoToken", session.synotoken);

    if (opts.params) {
      for (const [k, v] of Object.entries(opts.params))
        q.set(k, encodeParamValue(v));
    }

    const res = await fetch(url.toString(), {
      method: opts.method ?? "GET",
      cache: "no-store",
    });

    const json = (await res.json()) as SynologyResponse<T>;

    if (json.success) {
      const now = Date.now();
      await storeSession({ ...session, updatedAt: now });
      return json.data;
    }

    const code = json.error?.code;

    if (
      typeof code === "number" &&
      isSessionError(code) &&
      reloginAttempts < reloginRetries
    ) {
      reloginAttempts++;
      await forceRelogin();
      continue;
    }

    if (
      typeof code === "number" &&
      isTransientNetworkError(code) &&
      networkAttempts < networkRetries
    ) {
      networkAttempts++;
      const backoff = Math.min(1500, 150 * 2 ** (networkAttempts - 1));
      await sleep(backoff);
      continue;
    }

    throw new SynologyApiError(
      `Synology API failed: ${opts.api}.${opts.synoMethod}`,
      code,
    );
  }
}

// Used for raw responses, e.g. file downloads.
export async function synoCallRaw(
  opts: Omit<SynoCallOptions, "endpoint">,
): Promise<Response> {
  let reloginAttempts = 0;

  while (true) {
    const session = await getOrLoginSession();

    const url = new URL(entryUrl());
    const q = url.searchParams;

    q.set("api", opts.api);
    q.set("version", String(opts.version));
    q.set("method", opts.synoMethod);
    q.set("_sid", session.sid);

    if (session.synotoken) q.set("SynoToken", session.synotoken);

    if (opts.params) {
      for (const [k, v] of Object.entries(opts.params))
        q.set(k, encodeParamValue(v));
    }

    const res = await fetch(url.toString(), {
      method: opts.method ?? "GET",
      cache: "no-store",
      headers: opts.headers,
    });

    // Some “download” APIs return JSON with success:false and an error code.
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const json = (await res.json()) as SynologyResponse<unknown>;
      const code = json.success ? undefined : json.error?.code;

      if (
        typeof code === "number" &&
        isSessionError(code) &&
        reloginAttempts < (opts.reloginRetries ?? 1)
      ) {
        reloginAttempts++;
        await forceRelogin();
        continue;
      }

      if (!json.success) {
        throw new SynologyApiError("Synology download failed", code);
      }

      // If it was JSON-success, just return a JSON response.
      return Response.json(json);
    }

    return res;
  }
}
