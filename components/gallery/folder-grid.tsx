"use client";

import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Skeleton } from "@/components/ui/skeleton";
import type { Collection } from "@/types/api";
import { FolderCard } from "./folder-card";

type FolderGridProps = {
  folders: Collection[];
  isLoading: boolean;
  onFolderClick: (folder: Collection) => void;
};

export function FolderGrid({
  folders,
  isLoading,
  onFolderClick,
}: FolderGridProps) {
  if (!isLoading && folders.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {isLoading
        ? Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`folder-skeleton-${i}`}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-full">
                <AspectRatio ratio={1}>
                  <Skeleton className="h-full w-full rounded-2xl" />
                </AspectRatio>
              </div>
              <Skeleton className="h-3 w-2/3 rounded" />
            </div>
          ))
        : folders.map((folder) => (
            <FolderCard
              key={folder.id}
              name={folder.title}
              onClick={() => onFolderClick(folder)}
            />
          ))}
    </div>
  );
}
