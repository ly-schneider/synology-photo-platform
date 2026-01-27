import { isAuthenticated } from "@/lib/admin/auth";
import { getFeedback } from "@/lib/api/feedback";
import { NextRequest, NextResponse } from "next/server";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const pageParam = parseInt(
    searchParams.get("page") ?? String(DEFAULT_PAGE),
    10,
  );
  const limitParam = parseInt(
    searchParams.get("limit") ?? String(DEFAULT_LIMIT),
    10,
  );

  const page =
    Number.isFinite(pageParam) && pageParam > 0 ? pageParam : DEFAULT_PAGE;
  const limit =
    Number.isFinite(limitParam) && limitParam > 0 && limitParam <= MAX_LIMIT
      ? limitParam
      : DEFAULT_LIMIT;

  try {
    const result = await getFeedback(page, limit);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to get feedback:", error);
    return NextResponse.json(
      { error: "Failed to retrieve feedback" },
      { status: 500 },
    );
  }
}
