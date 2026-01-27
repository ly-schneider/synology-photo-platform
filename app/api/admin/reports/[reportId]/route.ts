import { isAuthenticated } from "@/lib/admin/auth";
import { deleteReport } from "@/lib/api/reportedItems";
import { NextRequest, NextResponse } from "next/server";

const REPORT_ID_PATTERN = /^[a-f0-9-]{36}$/;

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> },
): Promise<NextResponse> {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reportId } = await params;

  if (!reportId || !REPORT_ID_PATTERN.test(reportId)) {
    return NextResponse.json(
      { error: "Invalid report ID format" },
      { status: 400 },
    );
  }

  try {
    const deleted = await deleteReport(reportId);

    if (!deleted) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete report:", error);
    return NextResponse.json(
      { error: "Failed to delete report" },
      { status: 500 },
    );
  }
}
