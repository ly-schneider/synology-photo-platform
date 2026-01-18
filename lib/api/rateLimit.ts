import { createHash } from "crypto";
import { NextRequest } from "next/server";

import { getDb } from "@/lib/mongodb/client";

type RateLimitConfig = {
  limit: number;
  windowSeconds: number;
};

type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetAt: number;
};

type RateLimitDoc = {
  key: string;
  clientId: string;
  attempts: Date[];
  updatedAt: Date;
};

const COLLECTION_NAME = "rate_limits";
const RATE_LIMIT_CLEANUP_TTL_SECONDS = 7 * 24 * 60 * 60; // keep documents for a week without traffic

let indexesEnsured = false;
let indexesEnsuring: Promise<void> | null = null;

export function getClientId(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded?.trim()) {
    return forwarded.split(",")[0].trim();
  }

  const realIp =
    request.headers.get("x-real-ip") ?? request.headers.get("cf-connecting-ip");
  if (realIp?.trim()) return realIp.trim();

  const requestIp = (request as unknown as { ip?: string }).ip;
  if (requestIp?.trim()) return requestIp.trim();

  const userAgent = request.headers.get("user-agent");
  if (userAgent) {
    return `ua-${createHash("sha256").update(userAgent).digest("hex")}`;
  }

  throw new Error("Unable to determine client identifier for rate limiting");
}

async function ensureIndexes(): Promise<void> {
  if (indexesEnsured) return;
  if (indexesEnsuring) return indexesEnsuring;

  indexesEnsuring = (async () => {
    const db = await getDb();
    const collection = db.collection<RateLimitDoc>(COLLECTION_NAME);

    await Promise.all([
      collection.createIndex({ key: 1, clientId: 1 }, { unique: true }),
      collection.createIndex(
        { updatedAt: 1 },
        { expireAfterSeconds: RATE_LIMIT_CLEANUP_TTL_SECONDS },
      ),
    ]);

    indexesEnsured = true;
    indexesEnsuring = null;
  })();

  return indexesEnsuring;
}

async function recordAttempt(
  key: string,
  clientId: string,
  config: RateLimitConfig,
): Promise<{ attempts: Date[]; added: boolean; now: Date }> {
  await ensureIndexes();
  const db = await getDb();
  const collection = db.collection<RateLimitDoc>(COLLECTION_NAME);

  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowSeconds * 1000);

  const existing = await collection.findOne(
    { key, clientId },
    { projection: { attempts: 1 } },
  );

  const attemptsWithinWindow = (existing?.attempts ?? []).filter(
    (ts): ts is Date => ts instanceof Date && ts >= windowStart,
  );

  const added = attemptsWithinWindow.length < config.limit;
  const nextAttempts = added
    ? [...attemptsWithinWindow, now]
    : attemptsWithinWindow;

  await collection.updateOne(
    { key, clientId },
    {
      $set: {
        key,
        clientId,
        attempts: nextAttempts,
        updatedAt: now,
      },
    },
    { upsert: true },
  );

  return { attempts: nextAttempts, added, now };
}

export async function checkRateLimit(
  request: NextRequest,
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const clientId = getClientId(request);
  const { attempts, added, now } = await recordAttempt(
    key,
    clientId,
    config,
  );

  const resetAt = Math.floor(now.getTime() / 1000) + config.windowSeconds;
  const remaining = Math.max(0, config.limit - attempts.length);

  if (!added) {
    return { success: false, remaining: 0, resetAt };
  }

  return { success: true, remaining, resetAt };
}
