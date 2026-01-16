/**
 * Root folder boundary enforcement.
 *
 * When SYNOLOGY_ROOT_FOLDER_ID is configured, users can only access
 * folders within that hierarchy. This module provides utilities to
 * verify folder access is within the allowed boundary.
 */

import { notFound } from "@/lib/api/errors";
import { parseNumericId, readRecord } from "@/lib/api/mappers";
import { getRootFolderId, hasRootFolderBoundary } from "@/lib/api/visibilityConfig";
import { synoCallJson } from "@/lib/synology/client";
import { SynologyApiError } from "@/lib/synology/types";

type SynoRecord = Record<string, unknown>;

/**
 * Check if a folder is within the configured root folder boundary.
 * Uses the Synology list_parents API to get the folder's parent chain.
 *
 * Returns true if:
 * - No root folder boundary is configured (all folders allowed)
 * - The folder ID matches the root folder ID
 * - The root folder ID is in the folder's parent chain
 */
export async function isFolderWithinBoundary(
  folderId: string,
  params?: Record<string, unknown>,
): Promise<boolean> {
  if (!hasRootFolderBoundary()) return true;

  const rootId = getRootFolderId();
  if (!rootId) return true;

  const normalizedFolderId = String(parseNumericId(folderId));
  const normalizedRootId = String(parseNumericId(rootId));

  // If the folder is the root folder itself, allow access
  if (normalizedFolderId === normalizedRootId) return true;

  // Get parent chain for the folder
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

    // Check if root folder is in the parent chain
    for (const entry of list) {
      const entryId = extractFolderId(entry);
      if (entryId === normalizedRootId) {
        return true;
      }
    }

    return false;
  } catch (err) {
    if (err instanceof SynologyApiError) {
      // If we can't get parent info, deny access for safety
      return false;
    }
    throw err;
  }
}

/**
 * Assert that a folder is within the configured root folder boundary.
 * Throws a 404 error if the folder is outside the boundary.
 */
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

/**
 * Get the effective root folder ID for listings.
 * Returns the configured root folder ID or null if not configured.
 */
export function getEffectiveRootId(): string | null {
  return getRootFolderId();
}

function extractFolderId(entry: SynoRecord): string {
  const id = entry.id ?? entry.folder_id ?? entry.album_id ?? entry.share_id;
  return id !== undefined ? String(id) : "";
}
