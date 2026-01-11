import { SynologyApiError } from "@/lib/synology/types";
import { synoCallJson } from "@/lib/synology/client";
import { assertVisibleItem } from "@/lib/api/visibility";
import { notFound } from "@/lib/api/errors";

type SynoItem = Record<string, unknown>;

type FetchItemInfoOptions = {
  itemId: string;
  passphrase: string | null;
  additional: string[];
  folderId?: string | null;
};

type FetchVisibleItemInfoOptions = FetchItemInfoOptions & {
  notFoundMessage?: string;
};

const ITEM_ID_KEYS = ["id", "unit_id", "item_id", "photo_id"] as const;
const FOLDER_SCAN_LIMIT = 200;
const FOLDER_CACHE_TTL_MS = 60_000;
const folderItemCache = new Map<
  string,
  { expiresAt: number; items: Map<string, SynoItem> }
>();
const folderItemInflight = new Map<string, Promise<Map<string, SynoItem>>>();

export async function fetchVisibleItemInfo(
  options: FetchVisibleItemInfoOptions,
): Promise<SynoItem> {
  const { notFoundMessage } = options;
  const additional = ensureAdditionalIncludes(options.additional, "tag");
  const item = await fetchItemInfoWithFallback({
    ...options,
    additional,
  });
  if (!item) throw notFound(notFoundMessage ?? "Item not found");
  assertVisibleItem(item, notFoundMessage ?? "Item not found");
  return item;
}

export async function fetchItemInfoWithFallback(
  options: FetchItemInfoOptions,
): Promise<SynoItem | null> {
  const { itemId, passphrase, additional, folderId } = options;
  const idValue = parseNumericId(itemId);
  const idString = String(idValue);
  console.log("[itemInfo] start", { itemId: idString, additional, folderId });

  if (folderId) {
    const cached = getCachedFolderItem({
      itemId: idString,
      folderId,
      passphrase,
      additional,
    });
    if (cached) {
      console.log("[itemInfo] folder cache hit", { folderId });
      return cached;
    }

    try {
      const item = await findItemInFolder({
        itemId: idString,
        folderId,
        passphrase,
        additional,
      });
      if (item) {
        console.log("[itemInfo] folder hit", { folderId });
        return item;
      }
      console.log("[itemInfo] folder miss", { folderId });
      return null;
    } catch (err) {
      if (!(err instanceof SynologyApiError)) throw err;
      console.log("[itemInfo] folder error", { folderId, code: err.code ?? null });
    }
  }

  for (const key of ITEM_ID_KEYS) {
    const params: Record<string, unknown> = {
      [key]: idValue,
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

      const item = extractSingle(data);
      if (item) {
        console.log("[itemInfo] getinfo hit", { key });
        return item;
      }
    } catch (err) {
      if (!(err instanceof SynologyApiError)) throw err;
      console.log("[itemInfo] getinfo error", { key, code: err.code ?? null });
      const fallbackParams: Record<string, unknown> = {
        [key]: idValue,
      };
      if (passphrase) fallbackParams.passphrase = passphrase;
      try {
        const data = await synoCallJson<unknown>({
          api: "SYNO.FotoTeam.Browse.Item",
          version: 1,
          synoMethod: "getinfo",
          params: fallbackParams,
        });

        const item = extractSingle(data);
        if (item) {
          console.log("[itemInfo] getinfo fallback hit", { key });
          return item;
        }
      } catch (fallbackErr) {
        if (!(fallbackErr instanceof SynologyApiError)) throw fallbackErr;
        console.log("[itemInfo] getinfo fallback error", {
          key,
          code: fallbackErr.code ?? null,
        });
      }
    }
  }

  console.log("[itemInfo] miss", { itemId: idString });
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

function extractListWithTotal(
  data: unknown,
): { list: SynoItem[]; total: number } {
  const record = readRecord(data);
  const list = Array.isArray(record?.list) ? (record.list as SynoItem[]) : [];
  const totalValue = record?.total ?? record?.total_count;
  const total = typeof totalValue === "number" ? totalValue : Number(totalValue ?? list.length);
  return { list, total: Number.isFinite(total) ? total : list.length };
}

function readRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function parseNumericId(value: string): number | string {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
}

function ensureAdditionalIncludes(additional: string[], required: string): string[] {
  const target = required.trim().toLowerCase();
  if (!target) return additional;
  if (additional.some((entry) => entry.trim().toLowerCase() === target)) return additional;
  return [...additional, required];
}

function buildFolderCacheKey(
  folderId: string,
  passphrase: string | null,
  additional: string[],
): string {
  const normalized = [...additional]
    .map((entry) => entry.trim().toLowerCase())
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
  const { itemId, folderId, passphrase } = options;
  const additional = options.additional;
  const cacheKey = buildFolderCacheKey(folderId, passphrase, additional);
  const now = Date.now();
  const cached = folderItemCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.items.get(itemId) ?? null;
  }

  const inflight = folderItemInflight.get(cacheKey);
  if (inflight) {
    const items = await inflight;
    return items.get(itemId) ?? null;
  }

  const loader = loadFolderItems({
    folderId,
    passphrase,
    additional,
  });
  folderItemInflight.set(cacheKey, loader);
  try {
    const items = await loader;
    folderItemCache.set(cacheKey, {
      expiresAt: Date.now() + FOLDER_CACHE_TTL_MS,
      items,
    });
    return items.get(itemId) ?? null;
  } finally {
    folderItemInflight.delete(cacheKey);
  }
}

function getCachedFolderItem(options: {
  itemId: string;
  folderId: string;
  passphrase: string | null;
  additional: string[];
}): SynoItem | null {
  const { itemId, folderId, passphrase, additional } = options;
  const cacheKey = buildFolderCacheKey(folderId, passphrase, additional);
  const cached = folderItemCache.get(cacheKey);
  if (!cached || cached.expiresAt <= Date.now()) return null;
  return cached.items.get(itemId) ?? null;
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
    const { list, total: totalCount } = extractListWithTotal(data);
    total = totalCount;
    for (const entry of list) {
      const entryId =
        entry.id ?? entry.unit_id ?? entry.item_id ?? entry.photo_id ?? null;
      if (entryId === null || entryId === undefined) continue;
      items.set(String(entryId), entry);
    }
    if (list.length === 0) break;
    offset += list.length;
  }

  return items;
}
