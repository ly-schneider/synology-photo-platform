import { redis } from "@/lib/redis";
import type { SynologySession } from "./types";

const SESSION_KEY = "synology:session";
const SESSION_VERSION_KEY = "synology:session:version";

const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24; // 24h

export async function getStoredSession(): Promise<SynologySession | null> {
  const session = await redis.get<SynologySession>(SESSION_KEY);
  return session ?? null;
}

export async function storeSession(
  session: SynologySession,
  ttlSeconds: number = DEFAULT_SESSION_TTL_SECONDS,
): Promise<void> {
  await redis.set(SESSION_KEY, session, { ex: ttlSeconds });
}

export async function getSessionVersion(): Promise<number> {
  const version = await redis.get<number>(SESSION_VERSION_KEY);
  return version ?? 0;
}

export async function incrementSessionVersion(): Promise<number> {
  return await redis.incr(SESSION_VERSION_KEY);
}

export async function clearSession(): Promise<void> {
  await redis.del(SESSION_KEY);
}
