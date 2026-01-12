"use client";

import { CollectionBrowser } from "@/components/gallery/collection-browser";
import { PhotoViewer } from "@/components/viewer/photo-viewer";
import { useCollectionItems } from "@/hooks/use-collection-items";
import { usePhotoViewer } from "@/hooks/use-photo-viewer";
import type { Collection } from "@/types/api";
import { useRouter } from "next/navigation";
import { use } from "react";

type CollectionPageProps = {
  params: Promise<{ path: string[] }>;
};

export default function CollectionPage({ params }: CollectionPageProps) {
  const router = useRouter();
  const { path } = use(params);
  const currentCollectionId = path[path.length - 1];

  const { folders, items, isLoading } = useCollectionItems(currentCollectionId);

  const viewer = usePhotoViewer(items.length);
  const currentItem =
    viewer.viewerIndex !== null ? items[viewer.viewerIndex] : null;

  const handleBack = () => {
    if (path.length === 1) {
      router.push("/");
    } else {
      const parentPath = path.slice(0, -1).join("/");
      router.push(`/collection/${parentPath}`);
    }
  };

  const handleFolderClick = (folder: Collection) => {
    router.push(`/collection/${path.join("/")}/${folder.id}`);
  };

  return (
    <main className="flex-1 bg-background">
      <CollectionBrowser
        folders={folders}
        items={items}
        isLoading={isLoading}
        showBackButton={true}
        onBack={handleBack}
        onFolderClick={handleFolderClick}
        onItemClick={viewer.open}
      />

      {currentItem && (
        <PhotoViewer
          item={currentItem}
          isImageLoading={viewer.isImageLoading}
          hasPrevious={viewer.hasPrevious}
          hasNext={viewer.hasNext}
          onClose={viewer.close}
          onPrevious={viewer.goToPrevious}
          onNext={viewer.goToNext}
          onImageLoad={viewer.onImageLoad}
        />
      )}
    </main>
  );
}
