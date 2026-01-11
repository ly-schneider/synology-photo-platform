import { synoCallJson } from "@/lib/synology/client";
import { SynologyApiError } from "@/lib/synology/types";

type SynoCollection = Record<string, unknown>;

export async function fetchFolderInfoWithFallback(
  params: Record<string, unknown>,
  collectionId: string,
): Promise<SynoCollection | null> {
  const idParam = parseNumericId(collectionId);
  const baseParams: Record<string, unknown> = {
    ...params,
    id: idParam,
  };

  try {
    const data = await synoCallJson<unknown>({
      api: "SYNO.FotoTeam.Browse.Folder",
      version: 1,
      synoMethod: "getinfo",
      params: baseParams,
    });
    const info = extractSingle(data);
    if (info) return info;
  } catch (err) {
    if (!(err instanceof SynologyApiError)) throw err;
  }

  const fallbackParams: Record<string, unknown> = {
    ...baseParams,
    folder_id: idParam,
  };
  delete fallbackParams.id;

  try {
    const data = await synoCallJson<unknown>({
      api: "SYNO.FotoTeam.Browse.Folder",
      version: 1,
      synoMethod: "getinfo",
      params: fallbackParams,
    });
    const info = extractSingle(data);
    if (info) return info;
  } catch (err) {
    if (!(err instanceof SynologyApiError)) throw err;
  }

  try {
    const parents = await synoCallJson<unknown>({
      api: "SYNO.FotoTeam.Browse.Folder",
      version: 1,
      synoMethod: "list_parents",
      params: { id: idParam },
    });
    return extractFolderFromParents(parents, collectionId);
  } catch (err) {
    if (!(err instanceof SynologyApiError)) throw err;
  }

  return null;
}

function extractSingle(data: unknown): SynoCollection | null {
  const record = readRecord(data);
  if (Array.isArray(record?.list) && record.list.length > 0) {
    return record.list[0] as SynoCollection;
  }
  if (record?.info && typeof record.info === "object") {
    return record.info as SynoCollection;
  }
  return null;
}

function extractFolderFromParents(
  data: unknown,
  collectionId: string,
): SynoCollection | null {
  const record = readRecord(data);
  const list = Array.isArray(record?.list) ? (record.list as SynoCollection[]) : [];
  if (list.length === 0) return null;
  const idValue = String(parseNumericId(collectionId));
  const match = list.find((entry) => {
    const entryId = entry.id ?? entry.folder_id ?? entry.album_id ?? entry.share_id;
    return entryId !== undefined && String(entryId) === idValue;
  });
  return match ?? list[list.length - 1];
}

function readRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function parseNumericId(value: string): number | string {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
}
