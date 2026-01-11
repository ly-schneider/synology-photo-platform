import { NextRequest, NextResponse } from "next/server";

import { handleApiError, notFound } from "@/lib/api/errors";
import { fetchVisibleItemInfo } from "@/lib/api/itemInfo";
import { synoCallRaw } from "@/lib/synology/client";

const DEFAULT_CACHE_CONTROL = "public, max-age=86400";
type SynoItem = Record<string, unknown>;
type SynoRecord = Record<string, unknown>;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
): Promise<NextResponse> {
  try {
    const { itemId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const synoParams: Record<string, unknown> = {
      ...Object.fromEntries(searchParams.entries()),
      id: parseNumericId(itemId),
      type: "unit",
    };
    if (!("size" in synoParams)) synoParams.size = "m";
    const passphrase = searchParams.get("passphrase");
    const itemInfo = await fetchVisibleItemInfo({
      itemId,
      passphrase,
      additional: ["thumbnail"],
      folderId: searchParams.get("folder_id"),
      notFoundMessage: "Thumbnail not found",
    });
    if (!("cache_key" in synoParams)) {
      const cacheKey = resolveCacheKey(itemInfo);
      if (cacheKey) synoParams.cache_key = cacheKey;
    }

    const upstream = await synoCallRaw({
      api: "SYNO.FotoTeam.Thumbnail",
      version: 1,
      synoMethod: "get",
      params: synoParams,
    });

    if (upstream.status === 404) {
      throw notFound("Thumbnail not found");
    }

    const filename = `thumbnail-${itemId}.jpg`;
    const headers = buildProxyHeaders(upstream, {
      "Cache-Control": DEFAULT_CACHE_CONTROL,
      "Content-Disposition": buildContentDisposition(filename, "inline"),
    });

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

function buildProxyHeaders(
  upstream: Response,
  overrides: Record<string, string>,
): Headers {
  const headers = new Headers();
  const passthrough = [
    "content-type",
    "content-length",
    "etag",
    "cache-control",
    "last-modified",
  ];

  for (const key of passthrough) {
    const value = upstream.headers.get(key);
    if (value) headers.set(key, value);
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (value) headers.set(key, value);
  }

  return headers;
}

function buildContentDisposition(filename: string, disposition: "inline" | "attachment"): string {
  const safe = filename.replace(/"/g, "");
  return `${disposition}; filename="${safe}"`;
}

function resolveCacheKey(item: SynoItem): string | null {
  const additional = readRecord(item.additional);
  const thumbnail = readRecord(additional?.thumbnail);
  const cacheKey = thumbnail?.cache_key;
  if (typeof cacheKey === "string") return cacheKey;
  if (typeof cacheKey === "number") return String(cacheKey);
  return null;
}

function readRecord(value: unknown): SynoRecord | null {
  if (!value || typeof value !== "object") return null;
  return value as SynoRecord;
}

function parseNumericId(value: string): number | string {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
}
