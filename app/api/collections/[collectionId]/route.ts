import { NextRequest, NextResponse } from "next/server";

import { handleApiError, notFound } from "@/lib/api/errors";
import { fetchFolderInfoWithFallback } from "@/lib/api/folderInfo";
import { assertVisibleFolder } from "@/lib/api/visibility";
import type { Collection } from "@/lib/api/proxyUtils";

type SynoCollection = Record<string, unknown>;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ collectionId: string }> },
): Promise<NextResponse> {
  try {
    const { collectionId } = await params;
    const origin = request.nextUrl.origin;
    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
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

function mapCollection(data: SynoCollection, origin: string): Collection | null {
  const idValue = data.id ?? data.folder_id ?? data.album_id ?? data.share_id;
  if (!idValue) return null;

  const titleValue = data.name ?? data.title ?? idValue;
  const descriptionValue = data.description ?? null;
  const countValue = data.item_count ?? data.count ?? 0;
  const coverValue = data.cover_unit_id ?? null;

  return {
    id: String(idValue),
    type: "folder",
    title: String(titleValue),
    description: descriptionValue ? String(descriptionValue) : null,
    itemCount: Number.isFinite(Number(countValue)) ? Number(countValue) : 0,
    coverItemId: coverValue ? String(coverValue) : null,
    coverThumbnailUrl: coverValue
      ? `${origin}/api/items/${encodeURIComponent(String(coverValue))}/thumbnail?folder_id=${encodeURIComponent(
          String(idValue),
        )}`
      : null,
    createdAt: toIso(data.create_time ?? data.created_time),
    updatedAt: toIso(data.update_time ?? data.updated_time),
  };
}

function toIso(value: unknown): string | null {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return null;
  const ms = numeric > 1_000_000_000_000 ? numeric : numeric * 1000;
  return new Date(ms).toISOString();
}
