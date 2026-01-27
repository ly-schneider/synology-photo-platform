import { getVisitorId } from "@/lib/api/visitorId";
import { trackEvent, trackVisitor } from "@/lib/mongodb/analytics";
import type { TrackEventRequest } from "@/types/analytics";
import { NextRequest, NextResponse } from "next/server";

const MAX_STRING_LENGTH = 500;

function sanitizeString(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  return value.slice(0, MAX_STRING_LENGTH);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as TrackEventRequest;
    const visitorId = getVisitorId(request);

    if (body.type === "folder_view") {
      if (!body.folderId) {
        return NextResponse.json(
          { error: "folderId is required for folder_view" },
          { status: 400 },
        );
      }
      trackEvent({
        type: "folder_view",
        folderId: sanitizeString(body.folderId, "unknown"),
        folderName: sanitizeString(body.folderName, "Unknown"),
        visitorId,
      }).catch(() => {});
    } else if (body.type === "item_view") {
      if (!body.itemId) {
        return NextResponse.json(
          { error: "itemId is required for item_view" },
          { status: 400 },
        );
      }
      trackEvent({
        type: "item_view",
        itemId: sanitizeString(body.itemId, "unknown"),
        itemFilename: sanitizeString(body.itemFilename, "Unknown"),
        folderId: body.folderId ? sanitizeString(body.folderId, "unknown") : undefined,
        folderPath: body.folderPath?.map((p) => sanitizeString(p, "unknown")),
        visitorId,
      }).catch(() => {});
    } else {
      return NextResponse.json(
        { error: "Invalid event type" },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const visitorId = getVisitorId(request);
  trackVisitor(visitorId).catch(() => {});
  return NextResponse.json({ success: true });
}
