import { clearAuthCookie } from "@/lib/admin/auth";
import { NextResponse } from "next/server";

export async function POST(): Promise<NextResponse> {
  await clearAuthCookie();
  return NextResponse.json({ success: true });
}
