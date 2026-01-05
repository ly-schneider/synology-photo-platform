import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api/errors";
import type { Collection } from "@/lib/api/proxyUtils";
import { synoCallJson } from "@/lib/synology/client";

type SynoCollection = Record<string, unknown>;

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const params = request.nextUrl.searchParams;
    const offset = parseNumberParam(params.get("offset"), 0);
    const limit = parseNumberParam(params.get("limit"), 100);
    const origin = request.nextUrl.origin;

    const { synoMethod, synoParams } = buildFolderListRequest(params, offset, limit);
    const collections = await listCollections(synoParams, synoMethod, origin);
    const resolvedOffset = synoMethod === "list_parents" ? 0 : offset;
    const resolvedLimit =
      synoMethod === "list_parents" ? collections.data.length : limit;
    const total =
      Number.isFinite(collections.total) && collections.total > 0
        ? collections.total
        : resolvedOffset + collections.data.length;

    return NextResponse.json({
      data: collections.data,
      page: { offset: resolvedOffset, limit: resolvedLimit, total },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

async function listCollections(
  params: Record<string, unknown>,
  synoMethod: "list" | "list_parents",
  origin: string,
): Promise<{ data: Collection[]; total: number }> {
  const data = await synoCallJson<unknown>({
    api: "SYNO.FotoTeam.Browse.Folder",
    version: 1,
    synoMethod,
    params: synoMethod === "list" ? params : undefined,
  });

  const { list, total } = extractList(data);
  const mapped = list.map((entry) => mapCollection(entry, origin)).filter(Boolean) as Collection[];

  return { data: mapped, total };
}

function extractList(data: unknown): { list: SynoCollection[]; total: number } {
  const record = readRecord(data);
  const list = Array.isArray(record?.list) ? (record?.list as SynoCollection[]) : [];
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

function parseNumberParam(value: string | null, fallback: number): number {
  if (value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildFolderListRequest(
  params: URLSearchParams,
  offset: number,
  limit: number,
): { synoMethod: "list" | "list_parents"; synoParams: Record<string, unknown> } {
  const rootId = process.env.SYNOLOGY_ROOT_FOLDER_ID;
  const hasListParams =
    Boolean(rootId) ||
    params.has("offset") ||
    params.has("limit") ||
    params.has("id") ||
    params.has("sort_by") ||
    params.has("sort_direction");

  if (!hasListParams) {
    return { synoMethod: "list_parents", synoParams: {} };
  }

  const synoParams: Record<string, unknown> = {
    offset,
    limit,
  };

  const idValue = params.get("id") ?? rootId ?? "1";
  if (idValue !== null && idValue !== undefined && idValue !== "") {
    const numeric = Number(idValue);
    synoParams.id = Number.isFinite(numeric) ? numeric : idValue;
  }

  const sortBy = params.get("sort_by");
  if (sortBy) synoParams.sort_by = sortBy;

  const sortDirection = params.get("sort_direction");
  if (sortDirection === "asc" || sortDirection === "desc") {
    synoParams.sort_direction = sortDirection;
  }

  return { synoMethod: "list", synoParams };
}
