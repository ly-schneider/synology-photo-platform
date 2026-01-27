"use client";

import { CollectionBrowser } from "@/components/gallery/collection-browser";
import { PullToRefreshContainer } from "@/components/gallery/pull-to-refresh-container";
import { useCollections } from "@/hooks/use-collections";
import type { Collection } from "@/types/api";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const { collections, isLoading, isRefreshing, refetch } = useCollections();

  const handleFolderClick = (folder: Collection) => {
    router.push(`/collection/${folder.id}`);
  };

  return (
    <main className="flex-1 bg-background">
      <PullToRefreshContainer onRefresh={refetch} isRefreshing={isRefreshing}>
        <CollectionBrowser
          folders={collections}
          items={[]}
          isLoading={isLoading}
          showBackButton={false}
          onBack={() => {}}
          onFolderClick={handleFolderClick}
          onItemClick={() => {}}
        />
      </PullToRefreshContainer>
    </main>
  );
}
