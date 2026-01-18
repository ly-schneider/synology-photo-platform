import type { Collection, Item } from "@/lib/api/proxyUtils";

export type CollectionsResponse = {
  data: Collection[];
  page: { offset: number; limit: number; total: number };
};

export type CollectionItemsResponse = {
  folders: Collection[];
  items: Item[];
  foldersPage: { offset: number; limit: number; total: number };
  page: { offset: number; limit: number; total: number };
  currentFolderName?: string;
};

export type { Collection, Item };
