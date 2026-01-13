import { login } from "./auth";
import { clearSession, getSession, withLoginMutex } from "./sessionStore";
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

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function buildAuthHeaders(
  session: SynologySession,
  extra?: HeadersInit,
): HeadersInit | undefined {
  const headers = new Headers(extra);
  if (session.synotoken) headers.set("X-SYNO-TOKEN", session.synotoken);
  const cookieParts: string[] = [];
  const existingCookie = headers.get("Cookie");
  if (existingCookie) cookieParts.push(existingCookie);
  if (session.sid) cookieParts.push(`id=${session.sid}`);
  if (session.synotoken) cookieParts.push(`synotoken=${session.synotoken}`);
  if (cookieParts.length > 0) headers.set("Cookie", cookieParts.join("; "));
  return headers;
}

// Transient network errors that should trigger retry with backoff
function isTransientNetworkError(code: number): boolean {
  return (
    code === 109 || code === 110 || code === 111 || code === 117 || code === 118
  );
}

/**
 * Get or create a session for this request.
 * Uses short-lived in-memory cache so parallel API calls share the same session.
 * Login is protected by mutex so concurrent requests don't all try to login.
 */
async function getOrCreateSession(): Promise<SynologySession> {
  return withLoginMutex(async () => {
    // Double-check inside mutex (another request may have just logged in)
    const existing = getSession();
    if (existing) return existing;

    console.log(`[synology] logging in`);
    return await login();
  });
}

function encodeParamValue(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

type SynoCallOptions = {
  method?: "GET" | "POST";
  headers?: HeadersInit;
  api: string;
  version: number;
  synoMethod: string;
  params?: Record<string, unknown>;
  networkRetries?: number; // default 3
};

export async function synoCallJson<T>(opts: SynoCallOptions): Promise<T> {
  const networkRetries = opts.networkRetries ?? 3;
  let networkAttempts = 0;

  while (true) {
    const session = await getOrCreateSession();

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
      headers: buildAuthHeaders(session),
    });

    let json: SynologyResponse<T> | null = null;
    try {
      json = (await res.json()) as SynologyResponse<T>;
    } catch {
      throw new SynologyApiError(
        `Synology API returned invalid response: ${opts.api}.${opts.synoMethod}`,
        res.status || undefined,
      );
    }

    if (!json) {
      throw new SynologyApiError(
        `Synology API returned empty response: ${opts.api}.${opts.synoMethod}`,
        res.status || undefined,
      );
    }

    const code = json.success ? undefined : json.error?.code;

    if (json.success) {
      return json.data;
    }

    console.log(
      `[synology] API error: ${opts.api}.${opts.synoMethod} code=${code} status=${res.status}`,
    );

    // Retry transient network errors with backoff
    if (
      typeof code === "number" &&
      isTransientNetworkError(code) &&
      networkAttempts < networkRetries
    ) {
      networkAttempts++;
      const backoff = Math.min(1500, 150 * 2 ** (networkAttempts - 1));
      console.log(
        `[synology] transient error ${code}, retry ${networkAttempts}/${networkRetries} after ${backoff}ms`,
      );
      await sleep(backoff);
      continue;
    }

    // Clear session on auth errors so next request gets a fresh one
    if (
      res.status === 401 ||
      res.status === 403 ||
      code === 103 ||
      code === 106 ||
      code === 119 ||
      code === 150
    ) {
      clearSession();
    }

    throw new SynologyApiError(
      `Synology API failed: ${opts.api}.${opts.synoMethod}`,
      code ?? res.status,
    );
  }
}

// Used for raw responses, e.g. file downloads.
export async function synoCallRaw(
  opts: Omit<SynoCallOptions, "endpoint">,
): Promise<Response> {
  const session = await getOrCreateSession();

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
    headers: buildAuthHeaders(session, opts.headers),
  });

  // Handle auth errors
  if (res.status === 401 || res.status === 403) {
    clearSession();
    throw new SynologyApiError(
      `Synology API auth failed: ${opts.api}.${opts.synoMethod}`,
      res.status,
    );
  }

  // Some "download" APIs return JSON with success:false and an error code
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const json = (await res.json()) as SynologyResponse<unknown>;
    const code = json.success ? undefined : json.error?.code;

    if (!json.success) {
      // Clear session on auth errors
      if (code === 103 || code === 106 || code === 119 || code === 150) {
        clearSession();
      }
      throw new SynologyApiError("Synology download failed", code);
    }

    // If it was JSON-success, just return a JSON response
    return Response.json(json);
  }

  return res;
}
