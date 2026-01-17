import { notFound } from "@/lib/api/errors";
import { assertVisibleItem } from "@/lib/api/filtering";
import { isFolderWithinBoundary } from "@/lib/api/folderBoundary";
import { parseNumericId, readRecord } from "@/lib/api/mappers";
import { isItemReported } from "@/lib/api/reportedItems";
import { hasRootFolderBoundary } from "@/lib/api/visibilityConfig";
import { synoCallJson } from "@/lib/synology/client";
import { SynologyApiError } from "@/lib/synology/types";

type SynoItem = Record<string, unknown>;

type FetchVisibleItemInfoOptions = {
  itemId: string;
  passphrase: string | null;
  additional: string[];
  folderId?: string | null;
  notFoundMessage?: string;
};

const FOLDER_SCAN_LIMIT = 200;
const FOLDER_CACHE_TTL_MS = 60_000;
const folderItemCache = new Map<
  string,
  { expiresAt: number; items: Map<string, SynoItem> }
>();

export async function fetchVisibleItemInfo(
  options: FetchVisibleItemInfoOptions,
): Promise<SynoItem> {
  const { notFoundMessage = "Item not found", passphrase } = options;
  const additional = ensureTagIncluded(options.additional);

  const item = await fetchItemInfo({ ...options, additional });
  if (!item) throw notFound(notFoundMessage);

  // Verify the item's folder is within the allowed boundary
  if (hasRootFolderBoundary()) {
    const itemFolderId = extractItemFolderId(item);
    if (itemFolderId) {
      const params = passphrase ? { passphrase } : undefined;
      const withinBoundary = await isFolderWithinBoundary(itemFolderId, params);
      if (!withinBoundary) {
        throw notFound(notFoundMessage);
      }
    }
  }

  assertVisibleItem(item, notFoundMessage);

  // Check if item has been reported
  const itemId = item.id ?? item.unit_id ?? item.item_id ?? item.photo_id;
  if (itemId && (await isItemReported(String(itemId)))) {
    throw notFound(notFoundMessage);
  }

  return item;
}

async function fetchItemInfo(
  options: Omit<FetchVisibleItemInfoOptions, "notFoundMessage">,
): Promise<SynoItem | null> {
  const { itemId, passphrase, additional, folderId } = options;
  const idString = String(parseNumericId(itemId));

  // Try folder scan if folderId provided (most common path)
  if (folderId) {
    const item = await findItemInFolder({
      itemId: idString,
      folderId,
      passphrase,
      additional,
    });
    if (item) return item;
  }

  // Fall back to direct getinfo
  const params: Record<string, unknown> = {
    id: parseNumericId(itemId),
    additional,
  };
  if (passphrase) params.passphrase = passphrase;

  try {
    const data = await synoCallJson<unknown>({
      api: "SYNO.FotoTeam.Browse.Item",
      version: 1,
      synoMethod: "getinfo",
      params,
    });
    return extractSingle(data);
  } catch (err) {
    if (!(err instanceof SynologyApiError)) throw err;
    return null;
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

function ensureTagIncluded(additional: string[]): string[] {
  if (additional.some((e) => e.toLowerCase() === "tag")) return additional;
  return [...additional, "tag"];
}

function buildCacheKey(
  folderId: string,
  passphrase: string | null,
  additional: string[],
): string {
  const normalized = [...additional]
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join("|");
  return `${folderId}::${passphrase ?? ""}::${normalized}`;
}

async function findItemInFolder(options: {
  itemId: string;
  folderId: string;
  passphrase: string | null;
  additional: string[];
}): Promise<SynoItem | null> {
  const { itemId, folderId, passphrase, additional } = options;
  const cacheKey = buildCacheKey(folderId, passphrase, additional);
  const now = Date.now();

  // Check cache
  const cached = folderItemCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.items.get(itemId) ?? null;
  }

  // Load folder items
  try {
    const items = await loadFolderItems({ folderId, passphrase, additional });
    folderItemCache.set(cacheKey, {
      expiresAt: Date.now() + FOLDER_CACHE_TTL_MS,
      items,
    });
    return items.get(itemId) ?? null;
  } catch (err) {
    if (!(err instanceof SynologyApiError)) throw err;
    return null;
  }
}

async function loadFolderItems(options: {
  folderId: string;
  passphrase: string | null;
  additional: string[];
}): Promise<Map<string, SynoItem>> {
  const { folderId, passphrase, additional } = options;
  const items = new Map<string, SynoItem>();
  let offset = 0;
  let total = Infinity;

  while (offset < total) {
    const params: Record<string, unknown> = {
      folder_id: parseNumericId(folderId),
      offset,
      limit: FOLDER_SCAN_LIMIT,
      additional,
    };
    if (passphrase) params.passphrase = passphrase;

    const data = await synoCallJson<unknown>({
      api: "SYNO.FotoTeam.Browse.Item",
      version: 1,
      synoMethod: "list",
      params,
    });

    const record = readRecord(data);
    const list = Array.isArray(record?.list) ? (record.list as SynoItem[]) : [];
    const totalValue = record?.total ?? record?.total_count;
    total =
      typeof totalValue === "number"
        ? totalValue
        : Number(totalValue ?? list.length);

    for (const entry of list) {
      const entryId =
        entry.id ?? entry.unit_id ?? entry.item_id ?? entry.photo_id ?? null;
      if (entryId !== null && entryId !== undefined) {
        items.set(String(entryId), entry);
      }
    }

    if (list.length === 0) break;
    offset += list.length;
  }

  return items;
}

function extractItemFolderId(item: SynoItem): string | null {
  const folderId = item.folder_id ?? item.folderId ?? item.parent_folder_id;
  if (folderId === null || folderId === undefined) return null;
  return String(folderId);
}
