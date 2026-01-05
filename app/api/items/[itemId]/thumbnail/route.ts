import { NextRequest, NextResponse } from "next/server";

import { handleApiError, notFound } from "@/lib/api/errors";
import { synoCallJson, synoCallRaw } from "@/lib/synology/client";

const DEFAULT_CACHE_CONTROL = "public, max-age=86400";
type SynoItem = Record<string, unknown>;

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
    if (!("cache_key" in synoParams)) {
      const passphrase = searchParams.get("passphrase");
      try {
        const cacheKey = await resolveCacheKey(itemId, passphrase);
        if (cacheKey) synoParams.cache_key = cacheKey;
      } catch {
        // Best effort; some servers may not require cache_key.
      }
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

async function resolveCacheKey(
  itemId: string,
  passphrase: string | null,
): Promise<string | null> {
  const params: Record<string, unknown> = {
    id: parseNumericId(itemId),
    additional: ["thumbnail"],
  };
  if (passphrase) params.passphrase = passphrase;

  const data = await synoCallJson<unknown>({
    api: "SYNO.FotoTeam.Browse.Item",
    version: 1,
    synoMethod: "getinfo",
    params,
  });

  const item = extractSingle(data);
  const additional = readRecord(item?.additional);
  const thumbnail = readRecord(additional?.thumbnail);
  const cacheKey = thumbnail?.cache_key;
  if (typeof cacheKey === "string") return cacheKey;
  if (typeof cacheKey === "number") return String(cacheKey);
  return null;
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

function readRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function parseNumericId(value: string): number | string {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
}
