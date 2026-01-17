import { NextRequest, NextResponse } from "next/server";

import { ApiError, handleApiError } from "@/lib/api/errors";
import { checkRateLimit, getClientId } from "@/lib/api/rateLimit";
import { redis } from "@/lib/redis";

const RATE_LIMIT_CONFIG = {
  limit: 10,
  windowSeconds: 60,
};

const ITEM_ID_MAX_LENGTH = 128;
const ITEM_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const FILENAME_MAX_LENGTH = 255;
const REPORT_LIST_MAX_LENGTH = 200;
const REPORT_LIST_TTL_SECONDS = 60 * 60 * 24 * 30;
const DUPLICATE_WINDOW_SECONDS = 3600;

function validateItemId(raw: unknown): string {
  const value =
    typeof raw === "string" || typeof raw === "number" ? String(raw) : "";
  if (!value) {
    throw new ApiError(400, "BAD_REQUEST", "itemId is required");
  }
  if (value.length > ITEM_ID_MAX_LENGTH) {
    throw new ApiError(
      400,
      "BAD_REQUEST",
      `itemId exceeds maximum length of ${ITEM_ID_MAX_LENGTH} characters`,
    );
  }
  if (!ITEM_ID_PATTERN.test(value)) {
    throw new ApiError(
      400,
      "BAD_REQUEST",
      "itemId must be alphanumeric and may include - or _",
    );
  }
  return value;
}

function sanitizeFilename(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned =
    raw
      .replace(/[\x00-\x1F\x7F<>]/g, "")
      .replace(/\s+/g, " ")
      .trim() || "";

  if (!cleaned) return null;
  if (cleaned.length > FILENAME_MAX_LENGTH) {
    throw new ApiError(
      400,
      "BAD_REQUEST",
      `filename exceeds maximum length of ${FILENAME_MAX_LENGTH} characters`,
    );
  }
  return cleaned;
}

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
    const { filename } = body;
    const itemId = validateItemId(body.itemId);

    const clientIp = getClientId(request);
    const duplicateKey = `photo:report_duplicate:${itemId}:${clientIp}`;

    const isDuplicate = await redis.exists(duplicateKey);
    if (isDuplicate) {
      return NextResponse.json(
        { success: true, reportId: "duplicate" },
        { status: 200 },
      );
    }

    const sanitizedFilename = sanitizeFilename(filename);

    const reportId = crypto.randomUUID();
    const report = {
      reportId,
      reportedAt: new Date().toISOString(),
      userAgent: request.headers.get("user-agent") || "unknown",
      filename: sanitizedFilename,
    };

    const listKey = `photo:reports:${itemId}`;
    const pipeline = redis.pipeline();

    pipeline.lpush(listKey, JSON.stringify(report));
    pipeline.ltrim(listKey, 0, REPORT_LIST_MAX_LENGTH - 1);
    pipeline.expire(listKey, REPORT_LIST_TTL_SECONDS);
    pipeline.sadd("photo:reported_items", itemId);
    pipeline.setex(duplicateKey, DUPLICATE_WINDOW_SECONDS, "1");

    await pipeline.exec();

    return NextResponse.json({ success: true, reportId }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
