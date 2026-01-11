import { notFound } from "@/lib/api/errors";
import { hasHideTag, isHiddenFolderEntry } from "@/lib/api/filtering";

type SynoRecord = Record<string, unknown>;

export function assertVisibleFolder(
  entry: SynoRecord,
  message = "Collection not found",
): void {
  if (isHiddenFolderEntry(entry)) {
    throw notFound(message);
  }
}

export function assertVisibleItem(entry: SynoRecord, message = "Item not found"): void {
  if (hasHideTag(entry)) {
    throw notFound(message);
  }
}

export function filterVisibleFolders<T extends SynoRecord>(entries: T[]): T[] {
  return entries.filter((entry) => !isHiddenFolderEntry(entry));
}

export function filterVisibleItems<T extends SynoRecord>(entries: T[]): T[] {
  return entries.filter((entry) => !hasHideTag(entry));
}
