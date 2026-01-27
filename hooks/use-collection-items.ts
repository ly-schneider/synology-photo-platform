"use client";

import type { Collection, CollectionItemsResponse, Item } from "@/types/api";
import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_LIMIT = 200;

function trackFolderView(folderId: string, folderName?: string) {
  fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "folder_view",
      folderId,
      folderName: folderName ?? "Unknown",
    }),
  }).catch(() => {});
}

export function useCollectionItems(collectionId: string | null) {
  const [folders, setFolders] = useState<Collection[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loadedCollectionId, setLoadedCollectionId] = useState<string | null>(
    null,
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const trackedCollectionRef = useRef<string | null>(null);

  const fetchItems = useCallback(
    async (forceRefresh = false) => {
      if (!collectionId) return;

      const params = new URLSearchParams({
        offset: "0",
        limit: String(DEFAULT_LIMIT),
        additional: '["thumbnail"]',
      });

      const headers: HeadersInit = {};
      if (forceRefresh) {
        headers["x-cache-refresh"] = "true";
      }

      try {
        const res = await fetch(
          `/api/collections/${collectionId}/items?${params.toString()}`,
          { headers },
        );
        if (!res.ok) throw new Error("Failed to fetch");
        const data: CollectionItemsResponse = await res.json();

        setFolders(data.folders ?? []);
        setItems(data.items ?? []);
        setLoadedCollectionId(collectionId);

        if (trackedCollectionRef.current !== collectionId) {
          trackedCollectionRef.current = collectionId;
          trackFolderView(collectionId, data.currentFolderName);
        }
      } catch {
        setFolders([]);
        setItems([]);
        setLoadedCollectionId(collectionId);
      }
    },
    [collectionId],
  );

  useEffect(() => {
    if (!collectionId) return;
    let active = true;

    fetchItems(false).finally(() => {
      if (!active) return;
    });

    return () => {
      active = false;
    };
  }, [collectionId, fetchItems]);

  const isReady = collectionId !== null && loadedCollectionId === collectionId;
  const isLoading = collectionId !== null && !isReady;

  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const refetch = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchItems(true);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchItems]);

  return {
    folders,
    items,
    isLoading,
    isReady,
    isRefreshing,
    removeItem,
    refetch,
  };
}
