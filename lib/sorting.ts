import type { Collection, Item } from "@/lib/api/proxyUtils";

const nameCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

type SortDirection = "asc" | "desc";

function compareNames(a: string, b: string, direction: SortDirection): number {
  const result = nameCollator.compare(a, b);
  return direction === "asc" ? result : -result;
}

export function sortCollectionsByName(
  collections: Collection[],
  direction: SortDirection = "asc",
): Collection[] {
  return [...collections].sort((a, b) =>
    compareNames(a.title, b.title, direction),
  );
}

export function sortItemsByName(
  items: Item[],
  direction: SortDirection = "asc",
): Item[] {
  return [...items].sort((a, b) =>
    compareNames(a.filename, b.filename, direction),
  );
}

export function sortCollectionContents(
  folders: Collection[],
  items: Item[],
  direction: SortDirection = "asc",
): { folders: Collection[]; items: Item[] } {
  return {
    folders: sortCollectionsByName(folders, direction),
    items: sortItemsByName(items, direction),
  };
}
