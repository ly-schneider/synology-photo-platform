import { parseNumericId, readRecord } from "@/lib/api/mappers";
import { synoCallJson } from "@/lib/synology/client";
import { SynologyApiError } from "@/lib/synology/types";

type SynoCollection = Record<string, unknown>;

export async function fetchFolderInfoWithFallback(
  params: Record<string, unknown>,
  collectionId: string,
): Promise<SynoCollection | null> {
  const idParam = parseNumericId(collectionId);

  // Use list_parents - more reliable than getinfo which often fails with permission errors
  try {
    const data = await synoCallJson<unknown>({
      api: "SYNO.FotoTeam.Browse.Folder",
      version: 1,
      synoMethod: "list_parents",
      params: { ...params, id: idParam },
    });
    return extractFolderFromParents(data, collectionId);
  } catch (err) {
    if (!(err instanceof SynologyApiError)) throw err;
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
