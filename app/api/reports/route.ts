import { NextRequest, NextResponse } from "next/server";

import { ApiError, handleApiError } from "@/lib/api/errors";
import { checkRateLimit, getClientId } from "@/lib/api/rateLimit";
import { redis } from "@/lib/redis";

const RATE_LIMIT_CONFIG = {
  limit: 10,
  windowSeconds: 60,
};

const DUPLICATE_WINDOW_SECONDS = 3600;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rateLimitResult = await checkRateLimit(
      request,
      "reports",
      RATE_LIMIT_CONFIG,
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "RATE_LIMITED",
          message: "Too many requests. Please wait before submitting again.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              rateLimitResult.resetAt - Math.floor(Date.now() / 1000),
            ),
          },
        },
      );
    }

    const body = await request.json();
    const { itemId, filename } = body;

    if (!itemId) {
      throw new ApiError(400, "BAD_REQUEST", "itemId is required");
    }

    const clientIp = getClientId(request);
    const duplicateKey = `photo:report_duplicate:${itemId}:${clientIp}`;

    const isDuplicate = await redis.exists(duplicateKey);
    if (isDuplicate) {
      return NextResponse.json(
        { success: true, reportId: "duplicate" },
        { status: 201 },
      );
    }

    const sanitizedFilename =
      typeof filename === "string"
        ? filename
            .replace(/[\x00-\x1F\x7F<>]/g, "")
            .replace(/\s+/g, " ")
            .trim() || null
        : null;

    const reportId = crypto.randomUUID();
    const report = {
      reportId,
      reportedAt: new Date().toISOString(),
      userAgent: request.headers.get("user-agent") || "unknown",
      filename: sanitizedFilename,
    };

    await Promise.all([
      redis.lpush(`photo:reports:${itemId}`, JSON.stringify(report)),
      redis.sadd("photo:reported_items", itemId),
      redis.setex(duplicateKey, DUPLICATE_WINDOW_SECONDS, "1"),
    ]);

    return NextResponse.json({ success: true, reportId }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
