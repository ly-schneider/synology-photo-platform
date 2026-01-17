import { NextRequest, NextResponse } from "next/server";

import { ApiError, handleApiError } from "@/lib/api/errors";
import { redis } from "@/lib/redis";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { itemId, filename } = body;

    if (!itemId) {
      throw new ApiError(400, "BAD_REQUEST", "itemId is required");
    }

    const sanitizedFilename =
      typeof filename === "string"
        ? filename.replace(/[<>]/g, "").trim() || null
        : null;

    const reportId = crypto.randomUUID();
    const report = {
      reportedAt: new Date().toISOString(),
      userAgent: request.headers.get("user-agent") || "unknown",
      filename: sanitizedFilename,
    };

    await Promise.all([
      redis.lpush(`photo:reports:${itemId}`, JSON.stringify(report)),
      redis.sadd("photo:reported_items", itemId),
    ]);

    return NextResponse.json({ success: true, reportId }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
