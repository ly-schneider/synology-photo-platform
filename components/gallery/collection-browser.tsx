"use client";

import type { Collection, Item } from "@/types/api";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { EmptyState } from "./empty-state";
import { FolderGrid } from "./folder-grid";
import { ItemGrid } from "./item-grid";

type CollectionBrowserProps = {
  folders: Collection[];
  items: Item[];
  isLoading: boolean;
  showBackButton: boolean;
  onBack: () => void;
  onFolderClick: (folder: Collection) => void;
  onItemClick: (index: number) => void;
};

export function CollectionBrowser({
  folders,
  items,
  isLoading,
  showBackButton,
  onBack,
  onFolderClick,
  onItemClick,
}: CollectionBrowserProps) {
  const isEmpty = !isLoading && folders.length === 0 && items.length === 0;

  return (
    <div className="mx-auto w-full max-w-lg p-4">
      {showBackButton && (
        <button
          onClick={onBack}
          className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-muted transition-colors active:bg-muted/70"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="h-5 w-5" />
        </button>
      )}

      <FolderGrid
        folders={folders}
        isLoading={isLoading}
        onFolderClick={onFolderClick}
      />

      <ItemGrid
        items={items}
        isLoading={isLoading && showBackButton}
        onItemClick={onItemClick}
      />

      {isEmpty && <EmptyState />}
    </div>
  );
}
