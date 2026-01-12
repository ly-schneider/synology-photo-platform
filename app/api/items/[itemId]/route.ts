import { NextRequest, NextResponse } from "next/server";

import { handleApiError, notFound } from "@/lib/api/errors";
import { fetchVisibleItemInfo } from "@/lib/api/itemInfo";
import { mapItem } from "@/lib/api/mappers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
): Promise<NextResponse> {
  try {
    const { itemId } = await params;
    const query = request.nextUrl.searchParams;
    const origin = request.nextUrl.origin;

    const itemData = await fetchVisibleItemInfo({
      itemId,
      passphrase: query.get("passphrase"),
      additional: ["thumbnail"],
      folderId: query.get("folder_id"),
    });

    const item = mapItem(itemData, origin);
    if (!item) throw notFound("Item not found");

    return NextResponse.json(item);
  } catch (err) {
    return handleApiError(err);
  }
}
