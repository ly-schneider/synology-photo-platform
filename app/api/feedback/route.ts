import { NextRequest, NextResponse } from "next/server";

import { ApiError, handleApiError } from "@/lib/api/errors";
import { storeFeedback } from "@/lib/api/feedback";
import { checkRateLimit } from "@/lib/api/rateLimit";

// Rate limit: 5 feedback submissions per minute per IP
const RATE_LIMIT_CONFIG = {
  limit: 5,
  windowSeconds: 60,
};

// Maximum message length
const MAX_MESSAGE_LENGTH = 5000;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check rate limit
    const rateLimitResult = await checkRateLimit(
      request,
      "feedback",
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
    const { message } = body;

    if (
      !message ||
      typeof message !== "string" ||
      message.trim().length === 0
    ) {
      throw new ApiError(400, "BAD_REQUEST", "message is required");
    }

    const trimmedMessage = message.trim();

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      throw new ApiError(
        400,
        "BAD_REQUEST",
        `message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`,
      );
    }

    await storeFeedback({
      message: trimmedMessage,
      createdAt: new Date().toISOString(),
      userAgent: request.headers.get("user-agent") || "unknown",
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
