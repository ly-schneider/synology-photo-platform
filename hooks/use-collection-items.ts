"use client";

import type { Collection, CollectionItemsResponse, Item } from "@/types/api";
import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_LIMIT = 200;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// In-memory cache for stale-while-revalidate pattern (keyed by collectionId)
const collectionItemsCache = new Map<
  string,
  { folders: Collection[]; items: Item[]; timestamp: number }
>();

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
  // Initialize from cache if available
  const getCachedData = () => {
    if (!collectionId) return { folders: [], items: [] };
    const cached = collectionItemsCache.get(collectionId);
    return cached ? { folders: cached.folders, items: cached.items } : { folders: [], items: [] };
  };

  const cachedData = getCachedData();
  const hasCachedData = collectionId ? collectionItemsCache.has(collectionId) : false;

  const [folders, setFolders] = useState<Collection[]>(cachedData.folders);
  const [items, setItems] = useState<Item[]>(cachedData.items);
  const [loadedCollectionId, setLoadedCollectionId] = useState<string | null>(
    hasCachedData ? collectionId : null
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const trackedCollectionRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  const fetchItems = useCallback(
    async (forceRefresh = false, background = false) => {
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
          { headers }
        );
        if (!res.ok) throw new Error("Failed to fetch");
        const data: CollectionItemsResponse = await res.json();

        const newFolders = data.folders ?? [];
        const newItems = data.items ?? [];

        // Update cache
        collectionItemsCache.set(collectionId, {
          folders: newFolders,
          items: newItems,
          timestamp: Date.now(),
        });

        // Only update state if still mounted
        if (mountedRef.current) {
          setFolders(newFolders);
          setItems(newItems);
          setLoadedCollectionId(collectionId);
        }

        if (trackedCollectionRef.current !== collectionId) {
          trackedCollectionRef.current = collectionId;
          trackFolderView(collectionId, data.currentFolderName);
        }
      } catch {
        if (!background && mountedRef.current) {
          setFolders([]);
          setItems([]);
          setLoadedCollectionId(collectionId);
        }
      }
    },
    [collectionId]
  );

  useEffect(() => {
    if (!collectionId) return;
    mountedRef.current = true;

    const cached = collectionItemsCache.get(collectionId);
    const hasCached = cached !== undefined;
    const isCacheStale = cached
      ? Date.now() - cached.timestamp > CACHE_TTL
      : true;

    if (hasCached) {
      // We have cached data - display it immediately
      setFolders(cached.folders);
      setItems(cached.items);
      setLoadedCollectionId(collectionId);

      // Revalidate in background if stale
      if (isCacheStale) {
        fetchItems(false, true);
      }
    } else {
      // No cache - fetch with loading state
      setFolders([]);
      setItems([]);
      setLoadedCollectionId(null);
      fetchItems(false);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [collectionId, fetchItems]);

  const isReady = collectionId !== null && loadedCollectionId === collectionId;
  const isLoading = collectionId !== null && !isReady;

  const removeItem = (itemId: string) => {
    setItems((prev) => {
      const newItems = prev.filter((item) => item.id !== itemId);
      // Update cache when removing item
      if (collectionId) {
        const cached = collectionItemsCache.get(collectionId);
        if (cached) {
          collectionItemsCache.set(collectionId, {
            ...cached,
            items: newItems,
          });
        }
      }
      return newItems;
    });
  };

  const refetch = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchItems(true);
    } finally {
      if (mountedRef.current) setIsRefreshing(false);
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
