import { parseNumericId, readRecord } from "@/lib/api/mappers";
import { synoCallJson } from "@/lib/synology/client";
import { SynologyApiError } from "@/lib/synology/types";

type SynoCollection = Record<string, unknown>;

export async function fetchFolderInfoWithFallback(
  params: Record<string, unknown>,
  collectionId: string,
): Promise<SynoCollection | null> {
  const idParam = parseNumericId(collectionId);

  // Try getinfo first
  try {
    const data = await synoCallJson<unknown>({
      api: "SYNO.FotoTeam.Browse.Folder",
      version: 1,
      synoMethod: "getinfo",
      params: { ...params, id: idParam },
    });
    const info = extractSingle(data);
    if (info) return info;
  } catch (err) {
    if (!(err instanceof SynologyApiError)) throw err;
  }

  // Fall back to list_parents
  try {
    const data = await synoCallJson<unknown>({
      api: "SYNO.FotoTeam.Browse.Folder",
      version: 1,
      synoMethod: "list_parents",
      params: { id: idParam },
    });
    return extractFolderFromParents(data, collectionId);
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
  const list = Array.isArray(record?.list)
    ? (record.list as SynoCollection[])
    : [];
  if (list.length === 0) return null;

  const idValue = String(parseNumericId(collectionId));
  const match = list.find((entry) => {
    const entryId =
      entry.id ?? entry.folder_id ?? entry.album_id ?? entry.share_id;
    return entryId !== undefined && String(entryId) === idValue;
  });

  return match ?? list[list.length - 1];
}
