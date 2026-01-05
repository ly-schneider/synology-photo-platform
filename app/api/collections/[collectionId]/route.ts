import { NextRequest, NextResponse } from "next/server";

import { handleApiError, notFound } from "@/lib/api/errors";
import type { Collection } from "@/lib/api/proxyUtils";
import { synoCallJson } from "@/lib/synology/client";

type SynoCollection = Record<string, unknown>;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ collectionId: string }> },
): Promise<NextResponse> {
  try {
    const { collectionId } = await params;
    const origin = request.nextUrl.origin;

    const synoParams: Record<string, unknown> = {
      ...Object.fromEntries(request.nextUrl.searchParams.entries()),
      id: collectionId,
    };

    const collection = await fetchCollection(synoParams, origin);

    if (!collection) throw notFound("Collection not found");

    return NextResponse.json(collection);
  } catch (err) {
    return handleApiError(err);
  }
}

async function fetchCollection(
  params: Record<string, unknown>,
  origin: string,
): Promise<Collection | null> {
  const data = await synoCallJson<unknown>({
    api: "SYNO.FotoTeam.Browse.Folder",
    version: 1,
    synoMethod: "getinfo",
    params,
  });

  const item = extractSingle(data);
  if (!item) return null;
  return mapCollection(item, origin);
}

function extractSingle(data: unknown): SynoCollection | null {
  const record = readRecord(data);
  if (Array.isArray(record?.list) && record.list.length > 0) {
    return record.list[0] as SynoCollection;
  }
  if (record?.info && typeof record.info === "object") {
    return record.info as SynoCollection;
  }
  return null;
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
      ? `${origin}/api/items/${encodeURIComponent(String(coverValue))}/thumbnail`
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

function readRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}
