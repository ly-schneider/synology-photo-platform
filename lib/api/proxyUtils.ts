export type Collection = {
  id: string;
  type: "folder";
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
  type: "photo" | "video" | "other";
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
