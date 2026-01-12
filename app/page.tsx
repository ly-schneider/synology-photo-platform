"use client";

import { CollectionBrowser } from "@/components/gallery/collection-browser";
import { useCollections } from "@/hooks/use-collections";
import type { Collection } from "@/types/api";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const { collections, isLoading } = useCollections();

  const handleFolderClick = (folder: Collection) => {
    router.push(`/collection/${folder.id}`);
  };

  return (
    <main className="flex-1 bg-background">
      <CollectionBrowser
        folders={collections}
        items={[]}
        isLoading={isLoading}
        showBackButton={false}
        onBack={() => {}}
        onFolderClick={handleFolderClick}
        onItemClick={() => {}}
      />
    </main>
  );
}
