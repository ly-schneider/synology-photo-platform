import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api/errors";
import { assertVisibleFolder, filterVisibleFolders } from "@/lib/api/filtering";
import { assertFolderWithinBoundary } from "@/lib/api/folderBoundary";
import { fetchFolderInfoWithFallback } from "@/lib/api/folderInfo";
import {
  extractList,
  mapCollection,
  parseNumberParam,
} from "@/lib/api/mappers";
import type { Collection } from "@/lib/api/proxyUtils";
import { getRootFolderId } from "@/lib/api/visibilityConfig";
import { sortCollectionsByName } from "@/lib/sorting";
import { synoCallJson } from "@/lib/synology/client";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const params = request.nextUrl.searchParams;
    const offset = parseNumberParam(params.get("offset"), 0);
    const limit = parseNumberParam(params.get("limit"), 100);
    const origin = request.nextUrl.origin;
    const sortByParamRaw = params.get("sort_by");
    const sortByParam =
      sortByParamRaw && sortByParamRaw.trim() ? sortByParamRaw : null;
    const sortBy = sortByParam ?? "name";
    const sortDirection =
      params.get("sort_direction") === "desc" ? "desc" : "asc";

    const { synoMethod, synoParams } = buildFolderListRequest(
      params,
      offset,
      limit,
      sortByParam,
      sortDirection,
    );

    const targetId = synoMethod === "list" ? synoParams.id : null;
    const folderInfoParams: Record<string, unknown> = {};
    const passphrase = params.get("passphrase");
    if (passphrase) folderInfoParams.passphrase = passphrase;

    if (targetId !== null && targetId !== undefined) {
      // Verify the folder is within the allowed boundary
      await assertFolderWithinBoundary(
        String(targetId),
        folderInfoParams,
        "Collection not found",
      );

      const folderInfo = await fetchFolderInfoWithFallback(
        folderInfoParams,
        String(targetId),
      );
      if (folderInfo) {
        assertVisibleFolder(folderInfo, "Collection not found");
      }
    }

    const collections = await listCollections(synoParams, synoMethod, origin);
    const sortedCollections =
      sortBy === "name"
        ? {
            ...collections,
            data: sortCollectionsByName(collections.data, sortDirection),
          }
        : collections;

    const resolvedOffset = synoMethod === "list_parents" ? 0 : offset;
    const resolvedLimit =
      synoMethod === "list_parents" ? sortedCollections.data.length : limit;
    const total =
      Number.isFinite(sortedCollections.total) && sortedCollections.total > 0
        ? sortedCollections.total
        : resolvedOffset + sortedCollections.data.length;

    return NextResponse.json(
      {
        data: sortedCollections.data,
        page: { offset: resolvedOffset, limit: resolvedLimit, total },
      },
      {
        headers: {
          "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
        },
      },
    );
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
  const mapped = filterVisibleFolders(list)
    .map((entry) => mapCollection(entry, origin))
    .filter(Boolean) as Collection[];

  return { data: mapped, total };
}

function buildFolderListRequest(
  params: URLSearchParams,
  offset: number,
  limit: number,
  sortBy: string | null,
  sortDirection: "asc" | "desc",
): {
  synoMethod: "list" | "list_parents";
  synoParams: Record<string, unknown>;
} {
  const rootId = getRootFolderId();
  const requestedId = params.get("id");

  // When a root folder is configured, always use "list" method
  // and force navigation to start from the root
  const hasListParams =
    Boolean(rootId) ||
    Boolean(requestedId) ||
    params.has("offset") ||
    params.has("limit") ||
    params.has("sort_by") ||
    params.has("sort_direction");

  if (!hasListParams) {
    return { synoMethod: "list_parents", synoParams: {} };
  }

  const synoParams: Record<string, unknown> = { offset, limit };

  // Use requested ID, falling back to root folder ID if configured
  const idValue = requestedId ?? rootId ?? "1";
  if (idValue !== null && idValue !== undefined && idValue !== "") {
    const numeric = Number(idValue);
    synoParams.id = Number.isFinite(numeric) ? numeric : idValue;
  }

  if (sortBy) {
    synoParams.sort_by = sortBy;
    if (sortDirection === "asc" || sortDirection === "desc") {
      synoParams.sort_direction = sortDirection;
    }
  }

  return { synoMethod: "list", synoParams };
}
