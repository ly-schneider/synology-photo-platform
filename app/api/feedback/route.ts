import { NextRequest, NextResponse } from "next/server";

import { ApiError, handleApiError } from "@/lib/api/errors";
import { storeFeedback } from "@/lib/api/feedback";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      throw new ApiError(400, "BAD_REQUEST", "message is required");
    }

    await storeFeedback({
      message: message.trim(),
      createdAt: new Date().toISOString(),
      userAgent: request.headers.get("user-agent") || "unknown",
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
