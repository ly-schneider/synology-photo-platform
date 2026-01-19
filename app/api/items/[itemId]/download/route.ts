import { NextRequest, NextResponse } from "next/server";

import {
  handleApiError,
  notFound,
  rangeNotSatisfiable,
} from "@/lib/api/errors";
import { fetchVisibleItemInfo } from "@/lib/api/itemInfo";
import { parseNumericId } from "@/lib/api/mappers";
import { getVisitorId } from "@/lib/api/visitorId";
import { trackDownload } from "@/lib/mongodb/analytics";
import { synoCallRaw } from "@/lib/synology/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
): Promise<NextResponse> {
  try {
    const { itemId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const disposition =
      searchParams.get("disposition") === "inline" ? "inline" : "attachment";
    const range = request.headers.get("range");
    const passphrase = searchParams.get("passphrase");

    const itemInfo = await fetchVisibleItemInfo({
      itemId,
      passphrase,
      additional: [],
      folderId: searchParams.get("folder_id"),
    });

    const filename =
      searchParams.get("filename") ??
      resolveFilename(itemInfo) ??
      `item-${itemId}`;

    const cacheKeyParam = searchParams.get("cache_key");
    const synoParams: Record<string, unknown> = {
      unit_id: [parseNumericId(itemId)],
    };
    if (cacheKeyParam) synoParams.cache_key = [cacheKeyParam];
    if (passphrase) synoParams.passphrase = passphrase;

    const upstream = await synoCallRaw({
      api: "SYNO.FotoTeam.Download",
      version: 1,
      synoMethod: "download",
      params: synoParams,
      headers: range ? { range } : undefined,
    });

    if (upstream.status === 404) {
      throw notFound("Item not found");
    }

    if (upstream.status === 416) {
      throw rangeNotSatisfiable("Requested range not satisfiable");
    }

    const headers = buildProxyHeaders(upstream, {
      "Content-Disposition": buildContentDisposition(filename, disposition),
      ...(upstream.headers.get("accept-ranges")
        ? {}
        : { "Accept-Ranges": "bytes" }),
    });

    const shouldTrackDownload = disposition === "attachment";
    if (shouldTrackDownload) {
      const visitorId = getVisitorId(request);
      trackDownload(itemId, filename, visitorId).catch(() => {});
    }

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
    "content-range",
    "accept-ranges",
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

function buildContentDisposition(
  filename: string,
  disposition: "inline" | "attachment",
): string {
  const sanitized = sanitizeFilename(filename);
  const asciiFallback = toAsciiFilename(sanitized);
  const encoded = encodeRFC5987ValueChars(sanitized);
  if (encoded && asciiFallback !== sanitized) {
    return `${disposition}; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
  }
  return `${disposition}; filename="${asciiFallback}"`;
}

function resolveFilename(item: Record<string, unknown>): string | null {
  const filename = item.filename ?? item.name;
  if (typeof filename === "string" && filename.trim()) {
    return filename;
  }
  return null;
}

function sanitizeFilename(filename: string): string {
  const trimmed = filename.trim();
  if (!trimmed) return "download";
  return trimmed.replace(/[\\\/]+/g, "_").replace(/[\r\n"]/g, "");
}

function toAsciiFilename(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]+/g, "_");
  return ascii || "download";
}

function encodeRFC5987ValueChars(filename: string): string {
  return encodeURIComponent(filename)
    .replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%(7C|60|5E)/g, (match) => match.toUpperCase());
}
