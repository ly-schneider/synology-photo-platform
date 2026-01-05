export type CollectionType = "folder";
export type ItemType = "photo" | "video" | "other";
export type ThumbnailPreset = "xs" | "s" | "m" | "l" | "xl";
export type SortOption =
  | "createdAtDesc"
  | "createdAtAsc"
  | "takenAtDesc"
  | "takenAtAsc"
  | "filenameAsc"
  | "filenameDesc";

export type Pagination = {
  offset: number;
  limit: number;
  total: number;
};

export type Collection = {
  id: string;
  type: CollectionType;
  title: string;
  description: string | null;
  itemCount: number;
  coverItemId: string | null;
  coverThumbnailUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type Item = {
  id: string;
  type: ItemType;
  filename: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  takenAt?: string | null;
  createdAt?: string | null;
  width?: number | null;
  height?: number | null;
  thumbnailUrl?: string | null;
  downloadUrl?: string | null;
  exif?: Record<string, unknown> | null;
};
