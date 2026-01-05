import { redis } from "@/lib/redis";
import type { SynologySession } from "./types";

const SESSION_KEY = "synology:session";

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
