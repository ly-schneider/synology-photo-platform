import { NextRequest, NextResponse } from "next/server";

import { ensureAdditionalIncludes } from "@/lib/api/filtering";
import { handleApiError } from "@/lib/api/errors";
import {
  assertVisibleFolder,
  filterVisibleFolders,
  filterVisibleItems,
} from "@/lib/api/visibility";
import { fetchFolderInfoWithFallback } from "@/lib/api/folderInfo";
import type { Collection, Item } from "@/lib/api/proxyUtils";
import { sortCollectionContents } from "@/lib/sorting";
import { synoCallJson } from "@/lib/synology/client";

type SynoItem = Record<string, unknown>;
type SynoCollection = Record<string, unknown>;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ collectionId: string }> },
): Promise<NextResponse> {
  try {
    const { collectionId } = await params;
    const query = request.nextUrl.searchParams;
    const offset = parseNumberParam(query.get("offset"), 0);
    const limit = parseNumberParam(query.get("limit"), 100);
    const origin = request.nextUrl.origin;
    const sortByParamRaw = query.get("sort_by");
    const sortByParam = sortByParamRaw && sortByParamRaw.trim() ? sortByParamRaw : null;
    const sortDirection = query.get("sort_direction") === "desc" ? "desc" : "asc";

    const itemParams: Record<string, unknown> = {
      offset,
      limit,
      folder_id: parseNumericId(collectionId),
    };

    if (sortByParam) itemParams.sort_by = sortByParam;
    if (sortByParam && (sortDirection === "asc" || sortDirection === "desc")) {
      itemParams.sort_direction = sortDirection;
    }

    const type = query.get("type");
    if (type) itemParams.type = type;

    const passphrase = query.get("passphrase");
    if (passphrase) itemParams.passphrase = passphrase;

    const additional = ensureAdditionalIncludes(query.get("additional"), ["tag"]);
    itemParams.additional = additional;

    const folderParams: Record<string, unknown> = {
      offset,
      limit,
      id: parseNumericId(collectionId),
    };

    if (sortByParam) {
      folderParams.sort_by = sortByParam;
      if (sortDirection === "asc" || sortDirection === "desc") {
        folderParams.sort_direction = sortDirection;
      }
    }

    const folderInfoParams: Record<string, unknown> = passphrase ? { passphrase } : {};
    const [folderInfo, folderData, itemData] = await Promise.all([
      fetchFolderInfoWithFallback(folderInfoParams, collectionId),
      synoCallJson<unknown>({
        api: "SYNO.FotoTeam.Browse.Folder",
        version: 1,
        synoMethod: "list",
        params: folderParams,
      }),
      synoCallJson<unknown>({
        api: "SYNO.FotoTeam.Browse.Item",
        version: 1,
        synoMethod: "list",
        params: itemParams,
      }),
    ]);

    if (folderInfo) {
      assertVisibleFolder(folderInfo, "Collection not found");
    }

    const { list: folderList, total: folderTotal } = extractList(folderData);
    const mappedFolders = filterVisibleFolders(folderList)
      .map((entry) => mapCollection(entry, origin))
      .filter(Boolean) as Collection[];

    const { list: itemList, total: itemTotal } = extractList(itemData);
    const mappedItems = filterVisibleItems(itemList)
      .map((entry) => mapItem(entry, origin, collectionId))
      .filter(Boolean) as Item[];

    const shouldSortByName =
      !sortByParam || sortByParam === "name" || sortByParam === "filename";
    const { folders: sortedFolders, items: sortedItems } = shouldSortByName
      ? sortCollectionContents(mappedFolders, mappedItems, sortDirection)
      : { folders: mappedFolders, items: mappedItems };

    const resolvedFolderTotal =
      Number.isFinite(folderTotal) && folderTotal > 0
        ? folderTotal
        : offset + sortedFolders.length;
    const resolvedItemTotal =
      Number.isFinite(itemTotal) && itemTotal > 0 ? itemTotal : offset + sortedItems.length;

    return NextResponse.json({
      folders: sortedFolders,
      items: sortedItems,
      foldersPage: { offset, limit, total: resolvedFolderTotal },
      page: { offset, limit, total: resolvedItemTotal },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

function extractList(data: unknown): { list: SynoItem[]; total: number } {
  const record = readRecord(data);
  const list = Array.isArray(record?.list) ? (record?.list as SynoItem[]) : [];
  const totalValue = record?.total ?? record?.total_count;
  const total = typeof totalValue === "number" ? totalValue : Number(totalValue ?? list.length);
  return { list, total: Number.isFinite(total) ? total : list.length };
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

function mapItem(data: SynoItem, origin: string, folderId: string): Item | null {
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
  if (folderId) thumbnailParams.set("folder_id", folderId);
  const thumbnailQuery = thumbnailParams.toString();
  item.thumbnailUrl = `${origin}/api/items/${encodeURIComponent(id)}/thumbnail${
    thumbnailQuery ? `?${thumbnailQuery}` : ""
  }`;
  const downloadParams = new URLSearchParams();
  if (cacheKey) downloadParams.set("cache_key", cacheKey);
  if (filenameValue) downloadParams.set("filename", String(filenameValue));
  if (folderId) downloadParams.set("folder_id", folderId);
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
  if (thumbnail.sm === "ready") return "sm";
  if (thumbnail.m === "ready") return "m";
  if (thumbnail.xl === "ready") return "xl";
  return null;
}

function parseNumberParam(value: string | null, fallback: number): number {
  if (value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseNumericId(value: string): number | string {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
}
