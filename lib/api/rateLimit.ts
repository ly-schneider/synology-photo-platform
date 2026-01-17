import { NextRequest } from "next/server";

import { redis } from "@/lib/redis";

type RateLimitConfig = {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
};

type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetAt: number;
};

/**
 * Get client identifier from request (IP address or forwarded IP)
 */
function getClientId(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  return ip;
}

/**
 * Simple sliding window rate limiter using Redis
 */
export async function checkRateLimit(
  request: NextRequest,
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const clientId = getClientId(request);
  const rateLimitKey = `ratelimit:${key}:${clientId}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - config.windowSeconds;

  // Use a transaction to atomically check and update
  const pipeline = redis.pipeline();

  // Remove old entries outside the window
  pipeline.zremrangebyscore(rateLimitKey, 0, windowStart);

  // Count current entries in the window
  pipeline.zcard(rateLimitKey);

  // Add current request timestamp
  pipeline.zadd(rateLimitKey, {
    score: now,
    member: `${now}:${Math.random()}`,
  });

  // Set expiry on the key
  pipeline.expire(rateLimitKey, config.windowSeconds);

  const results = await pipeline.exec();

  // zcard result is at index 1
  const currentCount = (results[1] as number) || 0;
  const resetAt = now + config.windowSeconds;

  if (currentCount >= config.limit) {
    return {
      success: false,
      remaining: 0,
      resetAt,
    };
  }

  return {
    success: true,
    remaining: config.limit - currentCount - 1,
    resetAt,
  };
}
