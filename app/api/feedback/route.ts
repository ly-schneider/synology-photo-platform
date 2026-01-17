import { NextRequest, NextResponse } from "next/server";

import { ApiError, handleApiError } from "@/lib/api/errors";
import { storeFeedback } from "@/lib/api/feedback";
import { checkRateLimit } from "@/lib/api/rateLimit";

const RATE_LIMIT_CONFIG = {
  limit: 5,
  windowSeconds: 60,
};

const MAX_MESSAGE_LENGTH = 5000;

function sanitizeFeedbackMessage(raw: string): string {
  const withoutControlChars = raw.replace(
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,
    "",
  );
  return withoutControlChars.trim();
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
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

    const sanitizedMessage = sanitizeFeedbackMessage(message);

    if (sanitizedMessage.length === 0) {
      throw new ApiError(400, "BAD_REQUEST", "message is required");
    }

    if (sanitizedMessage.length > MAX_MESSAGE_LENGTH) {
      throw new ApiError(
        400,
        "BAD_REQUEST",
        `message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`,
      );
    }

    await storeFeedback({
      message: sanitizedMessage,
      createdAt: new Date().toISOString(),
      userAgent: request.headers.get("user-agent") || "unknown",
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
