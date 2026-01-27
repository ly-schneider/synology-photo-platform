import { isAuthenticated } from "@/lib/admin/auth";
import { deleteFeedback } from "@/lib/api/feedback";
import { NextRequest, NextResponse } from "next/server";

const FEEDBACK_ID_PATTERN = /^[a-f0-9]{24}$/;

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ feedbackId: string }> },
): Promise<NextResponse> {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { feedbackId } = await params;

  if (!feedbackId || !FEEDBACK_ID_PATTERN.test(feedbackId)) {
    return NextResponse.json(
      { error: "Invalid feedback ID format" },
      { status: 400 },
    );
  }

  try {
    const deleted = await deleteFeedback(feedbackId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Feedback not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete feedback:", error);
    return NextResponse.json(
      { error: "Failed to delete feedback" },
      { status: 500 },
    );
  }
}
