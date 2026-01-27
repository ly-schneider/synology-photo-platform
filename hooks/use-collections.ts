"use client";

import type { Collection, CollectionsResponse } from "@/types/api";
import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_LIMIT = 200;

const collectionsCache: {
  data: Collection[] | null;
  timestamp: number;
} = { data: null, timestamp: 0 };

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>(
    () => collectionsCache.data ?? []
  );
  const [isLoading, setIsLoading] = useState(() => !collectionsCache.data);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const mountedRef = useRef(true);

  const fetchCollections = useCallback(
    async (forceRefresh = false) => {
      const params = new URLSearchParams({
        offset: "0",
        limit: String(DEFAULT_LIMIT),
      });

      const headers: HeadersInit = {};
      if (forceRefresh) {
        headers["x-cache-refresh"] = "true";
      }

      try {
        const res = await fetch(`/api/collections?${params.toString()}`, {
          headers,
        });
        if (!res.ok) throw new Error("Failed to fetch");
        const data: CollectionsResponse = await res.json();
        const newCollections = data.data ?? [];

        collectionsCache.data = newCollections;
        collectionsCache.timestamp = Date.now();

        if (mountedRef.current) {
          setCollections(newCollections);
        }
      } catch {}
    },
    []
  );

  useEffect(() => {
    mountedRef.current = true;

    const hasCachedData = collectionsCache.data !== null;
    const isCacheStale =
      Date.now() - collectionsCache.timestamp > CACHE_TTL;

    if (hasCachedData) {
      setIsLoading(false);
      if (isCacheStale) {
        fetchCollections(false);
      }
    } else {
      setIsLoading(true);
      fetchCollections(false).finally(() => {
        if (mountedRef.current) setIsLoading(false);
      });
    }

    return () => {
      mountedRef.current = false;
    };
  }, [fetchCollections]);

  const refetch = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchCollections(true);
    } finally {
      if (mountedRef.current) setIsRefreshing(false);
    }
  }, [fetchCollections]);

  return { collections, isLoading, isRefreshing, refetch };
}
