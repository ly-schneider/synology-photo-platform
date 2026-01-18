import { isAdminEnabled } from "@/lib/admin/config";
import { isAuthenticated } from "@/lib/admin/auth";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  if (!isAdminEnabled()) {
    return NextResponse.json(
      { authenticated: false, adminEnabled: false },
      { status: 200 },
    );
  }

  const authenticated = await isAuthenticated();

  return NextResponse.json({ authenticated, adminEnabled: true });
}
