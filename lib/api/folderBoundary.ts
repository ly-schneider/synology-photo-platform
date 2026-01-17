import { notFound } from "@/lib/api/errors";
import { parseNumericId, readRecord } from "@/lib/api/mappers";
import {
  getRootFolderId,
  hasRootFolderBoundary,
} from "@/lib/api/visibilityConfig";
import { synoCallJson } from "@/lib/synology/client";
import { SynologyApiError } from "@/lib/synology/types";

type SynoRecord = Record<string, unknown>;

export async function isFolderWithinBoundary(
  folderId: string,
  params?: Record<string, unknown>,
): Promise<boolean> {
  if (!hasRootFolderBoundary()) return true;

  const rootId = getRootFolderId();
  if (!rootId) return true;

  const normalizedFolderId = String(parseNumericId(folderId));
  const normalizedRootId = String(parseNumericId(rootId));

  if (normalizedFolderId === normalizedRootId) return true;

  try {
    const data = await synoCallJson<unknown>({
      api: "SYNO.FotoTeam.Browse.Folder",
      version: 1,
      synoMethod: "list_parents",
      params: { ...params, id: parseNumericId(folderId) },
    });

    const record = readRecord(data);
    const list = Array.isArray(record?.list)
      ? (record.list as SynoRecord[])
      : [];

    const parentIds = list
      .map((entry) => extractFolderId(entry))
      .filter((id): id is string => id !== null);
    if (parentIds.includes(normalizedRootId)) return true;

    return false;
  } catch (err) {
    if (err instanceof SynologyApiError) {
      const code = err.code;
      if (code === 400 || code === 403 || code === 404 || code === 105) {
        return false;
      }
      throw err;
    }
    throw err;
  }
}

export async function assertFolderWithinBoundary(
  folderId: string,
  params?: Record<string, unknown>,
  message = "Collection not found",
): Promise<void> {
  const withinBoundary = await isFolderWithinBoundary(folderId, params);
  if (!withinBoundary) {
    throw notFound(message);
  }
}

export function getEffectiveRootId(): string | null {
  return getRootFolderId();
}

function extractFolderId(entry: SynoRecord): string | null {
  const id = entry.id ?? entry.folder_id ?? entry.album_id ?? entry.share_id;
  if (id === undefined || id === null || id === "") return null;
  return String(id);
}
