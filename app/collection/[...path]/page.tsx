"use client";

import { CollectionBrowser } from "@/components/gallery/collection-browser";
import { PullToRefreshContainer } from "@/components/gallery/pull-to-refresh-container";
import { PhotoViewer } from "@/components/viewer/photo-viewer";
import { useCollectionItems } from "@/hooks/use-collection-items";
import { usePhotoViewerWithUrl } from "@/hooks/use-photo-viewer-with-url";
import type { Collection } from "@/types/api";
import { useRouter } from "next/navigation";
import { Suspense, use } from "react";

type CollectionPageProps = {
  params: Promise<{ path: string[] }>;
};

function CollectionPageContent({ path }: { path: string[] }) {
  const router = useRouter();
  const currentCollectionId = path[path.length - 1];

  const {
    folders,
    items,
    isLoading,
    isReady,
    isRefreshing,
    removeItem,
    refetch,
  } = useCollectionItems(currentCollectionId);

  const viewer = usePhotoViewerWithUrl(items, isReady);
  const currentItem =
    viewer.viewerIndex !== null ? items[viewer.viewerIndex] : null;
  const prevItem =
    viewer.viewerIndex !== null && viewer.viewerIndex > 0
      ? items[viewer.viewerIndex - 1]
      : undefined;
  const nextItem =
    viewer.viewerIndex !== null && viewer.viewerIndex < items.length - 1
      ? items[viewer.viewerIndex + 1]
      : undefined;

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

  const handleReportSuccess = (itemId: string) => {
    removeItem(itemId);
    viewer.close();
  };

  return (
    <main className="flex-1 bg-background">
      <PullToRefreshContainer onRefresh={refetch} isRefreshing={isRefreshing}>
        <CollectionBrowser
          folders={folders}
          items={items}
          isLoading={isLoading}
          showBackButton={true}
          onBack={handleBack}
          onFolderClick={handleFolderClick}
          onItemClick={viewer.open}
        />
      </PullToRefreshContainer>

      {currentItem && (
        <PhotoViewer
          item={currentItem}
          isImageLoading={viewer.isImageLoading}
          hasPrevious={viewer.hasPrevious}
          hasNext={viewer.hasNext}
          folderId={currentCollectionId}
          folderPath={path}
          prevItem={prevItem}
          nextItem={nextItem}
          onClose={viewer.close}
          onPrevious={viewer.goToPrevious}
          onNext={viewer.goToNext}
          onImageLoad={viewer.onImageLoad}
          onReportSuccess={handleReportSuccess}
        />
      )}
    </main>
  );
}

function LoadingState() {
  return (
    <main className="flex-1 bg-background">
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Laden...</div>
      </div>
    </main>
  );
}

export default function CollectionPage({ params }: CollectionPageProps) {
  const { path } = use(params);

  return (
    <Suspense fallback={<LoadingState />}>
      <CollectionPageContent path={path} />
    </Suspense>
  );
}
