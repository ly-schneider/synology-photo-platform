import { redis } from "@/lib/redis";
import type { SynologySession } from "./types";

const SESSION_KEY = "synology:session";
const SESSION_VERSION_KEY = "synology:session:version";
export const USE_SHARED_SESSION =
  process.env.SYNOLOGY_USE_SHARED_SESSION !== "false";

const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24; // 24h

let memorySession: SynologySession | null = null;
let memoryVersion = 0;

export async function getStoredSession(): Promise<SynologySession | null> {
  if (!USE_SHARED_SESSION) return memorySession;
  const session = await redis.get<SynologySession>(SESSION_KEY);
  return session ?? null;
}

export async function storeSession(
  session: SynologySession,
  ttlSeconds: number = DEFAULT_SESSION_TTL_SECONDS,
): Promise<void> {
  if (!USE_SHARED_SESSION) {
    memorySession = session;
    return;
  }
  await redis.set(SESSION_KEY, session, { ex: ttlSeconds });
}

export async function getSessionVersion(): Promise<number> {
  if (!USE_SHARED_SESSION) return memoryVersion;
  const version = await redis.get<number>(SESSION_VERSION_KEY);
  return version ?? 0;
}

export async function incrementSessionVersion(): Promise<number> {
  if (!USE_SHARED_SESSION) {
    memoryVersion += 1;
    return memoryVersion;
  }
  return await redis.incr(SESSION_VERSION_KEY);
}

export async function clearSession(): Promise<void> {
  if (!USE_SHARED_SESSION) {
    memorySession = null;
    memoryVersion = 0;
    return;
  }
  await redis.del(SESSION_KEY);
}
