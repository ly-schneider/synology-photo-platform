import { NextRequest, NextResponse } from "next/server";

import { handleApiError, notFound } from "@/lib/api/errors";
import { assertVisibleFolder } from "@/lib/api/filtering";
import { fetchFolderInfoWithFallback } from "@/lib/api/folderInfo";
import { mapCollection } from "@/lib/api/mappers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ collectionId: string }> },
): Promise<NextResponse> {
  try {
    const { collectionId } = await params;
    const origin = request.nextUrl.origin;
    const searchParams = Object.fromEntries(
      request.nextUrl.searchParams.entries(),
    );

    const entry = await fetchFolderInfoWithFallback(searchParams, collectionId);
    if (!entry) throw notFound("Collection not found");

    assertVisibleFolder(entry, "Collection not found");

    const collection = mapCollection(entry, origin);
    if (!collection) throw notFound("Collection not found");

    return NextResponse.json(collection);
  } catch (err) {
    return handleApiError(err);
  }
}
