import { createHash } from "crypto";
import { NextRequest } from "next/server";

export function getVisitorId(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    "unknown";

  const userAgent = request.headers.get("user-agent") ?? "";
  const combined = `${ip}:${userAgent}`;

  return createHash("sha256").update(combined).digest("hex").substring(0, 16);
}
