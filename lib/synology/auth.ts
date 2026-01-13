import { setSession } from "./sessionStore";
import type { SynologyResponse, SynologySession } from "./types";
import { SynologyApiError } from "./types";

function synoWebApiBase(): string {
  const base = process.env.SYNOLOGY_PHOTO_BASE_URL;
  if (!base) throw new Error("Missing env SYNOLOGY_PHOTO_BASE_URL");
  return base + "/photo/webapi";
}

function authUrl(): string {
  return synoWebApiBase() + "/auth.cgi";
}

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export async function login(): Promise<SynologySession> {
  const params = new URLSearchParams();
  params.set("api", "SYNO.API.Auth");
  params.set("version", "7");
  params.set("method", "login");
  params.set("account", env("SYNOLOGY_USERNAME"));
  params.set("passwd", env("SYNOLOGY_PASSWORD"));
  params.set("format", "sid");
  params.set("enable_syno_token", "yes");

  const res = await fetch(authUrl(), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: params.toString(),
    cache: "no-store",
  });

  const json = (await res.json()) as SynologyResponse<{
    sid?: string;
    synotoken?: string;
  }>;

  if (!json.success) {
    throw new SynologyApiError("Synology login failed", json.error?.code);
  }

  if (!json.data?.sid) {
    throw new SynologyApiError("Synology login response missing sid");
  }

  const now = Date.now();
  const session: SynologySession = {
    sid: json.data.sid,
    synotoken: json.data.synotoken,
    createdAt: now,
    updatedAt: now,
  };

  console.log(
    `[synology] login success sid=${session.sid ? "yes" : "no"} synotoken=${session.synotoken ? "yes" : "no"}`,
  );

  setSession(session);
  return session;
}
