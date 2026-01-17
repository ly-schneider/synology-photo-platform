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
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  return ip;
}

function validatePipelineResults(
  results: unknown[] | null,
): asserts results is unknown[] {
  if (!results) {
    throw new Error("Redis pipeline execution returned no results");
  }

  for (const item of results) {
    if (Array.isArray(item) && item.length > 0 && item[0]) {
      const err = item[0];
      if (err instanceof Error) {
        throw err;
      }
      throw new Error(String(err));
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
    member: `${now}:${Math.random()}`,
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
