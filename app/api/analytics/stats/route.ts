import { isAuthenticated } from "@/lib/admin/auth";
import { getStats } from "@/lib/mongodb/analytics";
import type { StatsPeriod } from "@/types/analytics";
import { NextRequest, NextResponse } from "next/server";

const VALID_PERIODS: StatsPeriod[] = ["7d", "30d", "90d", "all"];

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const periodParam = searchParams.get("period") ?? "30d";

  if (!VALID_PERIODS.includes(periodParam as StatsPeriod)) {
    return NextResponse.json(
      { error: "Invalid period. Valid values: 7d, 30d, 90d, all" },
      { status: 400 },
    );
  }

  const period = periodParam as StatsPeriod;

  try {
    const stats = await getStats(period);
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Failed to get stats:", error);
    return NextResponse.json(
      { error: "Failed to retrieve statistics" },
      { status: 500 },
    );
  }
}
