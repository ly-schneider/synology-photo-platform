import { createHash } from "crypto";
import { NextRequest } from "next/server";

import { redis } from "@/lib/redis";

type RateLimitConfig = {
  limit: number;
  windowSeconds: number;
};

type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetAt: number;
};

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

function validatePipelineResults(
  results: unknown[] | null,
): asserts results is unknown[] {
  if (!results) {
    throw new Error("Redis pipeline execution returned no results");
  }

  for (const item of results) {
    if (Array.isArray(item)) {
      const [err] = item as [unknown, unknown];
      if (err) {
        if (err instanceof Error) {
          throw err;
        }
        throw new Error(String(err));
      }
      continue;
    }

    if (item instanceof Error) {
      throw item;
    }
  }
}

function parseNumberResult(entry: unknown): number {
  const value = Array.isArray(entry) ? entry[1] : entry;
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function checkRateLimit(
  request: NextRequest,
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const clientId = getClientId(request);
  const rateLimitKey = `ratelimit:${key}:${clientId}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - config.windowSeconds;

  const cleanupPipeline = redis.pipeline();

  cleanupPipeline.zremrangebyscore(rateLimitKey, 0, windowStart);
  cleanupPipeline.zcard(rateLimitKey);
  cleanupPipeline.expire(rateLimitKey, config.windowSeconds);

  const cleanupResults = await cleanupPipeline.exec();
  validatePipelineResults(cleanupResults);

  const zcardResultEntry = cleanupResults[1] as unknown;
  const currentCount = parseNumberResult(zcardResultEntry);
  const resetAt = now + config.windowSeconds;

  if (currentCount >= config.limit) {
    return {
      success: false,
      remaining: 0,
      resetAt,
    };
  }

  const addPipeline = redis.pipeline();
  addPipeline.zadd(rateLimitKey, {
    score: now,
    member: `${now}:${crypto.randomUUID()}`,
  });
  addPipeline.expire(rateLimitKey, config.windowSeconds);

  const addResults = await addPipeline.exec();
  validatePipelineResults(addResults);

  return {
    success: true,
    remaining: config.limit - currentCount - 1,
    resetAt,
  };
}
