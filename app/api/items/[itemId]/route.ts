import { NextRequest, NextResponse } from "next/server";

import { handleApiError, notFound } from "@/lib/api/errors";
import type { Item } from "@/lib/api/proxyUtils";
import { synoCallJson } from "@/lib/synology/client";

type SynoItem = Record<string, unknown>;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
): Promise<NextResponse> {
  try {
    const { itemId } = await params;
    const query = request.nextUrl.searchParams;
    const origin = request.nextUrl.origin;

    const synoParams: Record<string, unknown> = {
      ...Object.fromEntries(query.entries()),
      id: itemId,
    };

    const data = await synoCallJson<unknown>({
      api: "SYNO.FotoTeam.Browse.Item",
      version: 1,
      synoMethod: "getinfo",
      params: synoParams,
    });

    const itemData = extractSingle(data);
    if (!itemData) throw notFound("Item not found");

    const item = mapItem(itemData, origin);
    if (!item) throw notFound("Item not found");

    return NextResponse.json(item as Item);
  } catch (err) {
    return handleApiError(err);
  }
}

function extractSingle(data: unknown): SynoItem | null {
  const record = readRecord(data);
  if (Array.isArray(record?.list) && record.list.length > 0) {
    return record.list[0] as SynoItem;
  }
  if (record?.info && typeof record.info === "object") {
    return record.info as SynoItem;
  }
  return null;
}

function mapItem(data: SynoItem, origin: string): Item | null {
  const idValue = data.id ?? data.unit_id ?? data.item_id ?? data.photo_id;
  if (!idValue) return null;
  const id = String(idValue);

  const filenameValue = data.filename ?? data.name ?? id;
  const additional = readRecord(data.additional);
  const resolution = readRecord(additional?.resolution);
  const thumbnail = readRecord(additional?.thumbnail);
  const cacheKeyValue = thumbnail?.cache_key;
  const cacheKey =
    typeof cacheKeyValue === "string" || typeof cacheKeyValue === "number"
      ? String(cacheKeyValue)
      : null;
  const thumbnailSize = pickThumbnailSize(thumbnail);

  const item: Item = {
    id,
    type: parseItemType(data.type ?? data.item_type ?? data.media_type),
    filename: String(filenameValue),
  };

  if (data.mime_type || data.mime) {
    item.mimeType = String(data.mime_type ?? data.mime);
  }
  if (data.filesize || data.size) {
    const size = Number(data.filesize ?? data.size);
    item.sizeBytes = Number.isFinite(size) ? size : undefined;
  }

  const takenAt = toIso(data.time ?? data.taken_time);
  if (takenAt) item.takenAt = takenAt;
  const createdAt = toIso(data.create_time ?? data.created_time);
  if (createdAt) item.createdAt = createdAt;

  const width = Number(resolution?.width ?? data.width ?? data.resolutionx);
  const height = Number(resolution?.height ?? data.height ?? data.resolutiony);
  if (Number.isFinite(width)) item.width = width;
  if (Number.isFinite(height)) item.height = height;

  if (additional?.exif && typeof additional.exif === "object") {
    item.exif = additional.exif as Record<string, unknown>;
  }

  const thumbnailParams = new URLSearchParams();
  if (cacheKey) thumbnailParams.set("cache_key", cacheKey);
  if (thumbnailSize) thumbnailParams.set("size", thumbnailSize);
  const thumbnailQuery = thumbnailParams.toString();
  item.thumbnailUrl = `${origin}/api/items/${encodeURIComponent(id)}/thumbnail${
    thumbnailQuery ? `?${thumbnailQuery}` : ""
  }`;
  const downloadParams = new URLSearchParams();
  if (cacheKey) downloadParams.set("cache_key", cacheKey);
  if (filenameValue) downloadParams.set("filename", String(filenameValue));
  const downloadQuery = downloadParams.toString();
  item.downloadUrl = `${origin}/api/items/${encodeURIComponent(id)}/download${
    downloadQuery ? `?${downloadQuery}` : ""
  }`;

  return item;
}

function parseItemType(value: unknown): "photo" | "video" | "other" {
  if (typeof value === "number") {
    if (value === 1) return "photo";
    if (value === 2) return "video";
    if (value === 3) return "photo";
  }
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    if (lower === "live") return "photo";
    if (lower.includes("photo") || lower.includes("image")) return "photo";
    if (lower.includes("video")) return "video";
  }
  return "other";
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

function pickThumbnailSize(thumbnail: Record<string, unknown> | null): "xl" | "m" | "sm" | null {
  if (!thumbnail) return null;
  if (thumbnail.xl === "ready") return "xl";
  if (thumbnail.m === "ready") return "m";
  if (thumbnail.sm === "ready") return "sm";
  return null;
}
