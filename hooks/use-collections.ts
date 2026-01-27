"use client";

import type { Collection, CollectionsResponse } from "@/types/api";
import { useCallback, useEffect, useState } from "react";

const DEFAULT_LIMIT = 200;

export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchCollections = useCallback(async (forceRefresh = false) => {
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
      setCollections(data.data ?? []);
    } catch {
      // Keep existing collections on error
    }
  }, []);

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    fetchCollections(false).finally(() => {
      if (active) setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [fetchCollections]);

  const refetch = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchCollections(true);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchCollections]);

  return { collections, isLoading, isRefreshing, refetch };
}
