/**
 * Visibility mode configuration for photo filtering.
 *
 * - "hide" mode (default): All photos are visible by default.
 *   Photos with the "hide" tag are filtered out.
 *
 * - "show" mode: No photos are visible by default.
 *   Only photos with the "show" tag are displayed.
 *
 * Note: Folders are always visible regardless of visibility mode.
 */

export type VisibilityMode = "show" | "hide";

const DEFAULT_VISIBILITY_MODE: VisibilityMode = "hide";

/**
 * Get the configured visibility mode from environment.
 */
export function getVisibilityMode(): VisibilityMode {
  const mode = process.env.PHOTO_VISIBILITY_MODE?.trim().toLowerCase();
  if (mode === "show" || mode === "hide") {
    return mode;
  }
  return DEFAULT_VISIBILITY_MODE;
}

/**
 * Get the configured root folder ID from environment.
 * Returns null if not configured (all folders accessible).
 */
export function getRootFolderId(): string | null {
  const rootId = process.env.SYNOLOGY_ROOT_FOLDER_ID?.trim();
  if (!rootId || rootId === "") return null;
  return rootId;
}

/**
 * Check if a root folder boundary is configured.
 */
export function hasRootFolderBoundary(): boolean {
  return getRootFolderId() !== null;
}
