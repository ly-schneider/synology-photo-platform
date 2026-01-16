import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api/errors";
import {
  assertVisibleFolder,
  ensureAdditionalIncludes,
  filterVisibleFolders,
  filterVisibleItems,
} from "@/lib/api/filtering";
import { assertFolderWithinBoundary } from "@/lib/api/folderBoundary";
import { fetchFolderInfoWithFallback } from "@/lib/api/folderInfo";
import {
  extractList,
  mapCollection,
  mapItem,
  parseNumberParam,
  parseNumericId,
} from "@/lib/api/mappers";
import type { Collection, Item } from "@/lib/api/proxyUtils";
import { sortCollectionContents } from "@/lib/sorting";
import { synoCallJson } from "@/lib/synology/client";

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
    const sortByParam =
      sortByParamRaw && sortByParamRaw.trim() ? sortByParamRaw : null;
    const sortDirection =
      query.get("sort_direction") === "desc" ? "desc" : "asc";

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

    const additional = ensureAdditionalIncludes(query.get("additional"), [
      "tag",
    ]);
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

    const folderInfoParams: Record<string, unknown> = passphrase
      ? { passphrase }
      : {};

    // Verify the folder is within the allowed boundary
    await assertFolderWithinBoundary(
      collectionId,
      folderInfoParams,
      "Collection not found",
    );

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
      Number.isFinite(itemTotal) && itemTotal > 0
        ? itemTotal
        : offset + sortedItems.length;

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
