"use client";

import type { Collection, CollectionsResponse } from "@/types/api";
import { useEffect, useState } from "react";

const DEFAULT_LIMIT = 200;

export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const params = new URLSearchParams({
      offset: "0",
      limit: String(DEFAULT_LIMIT),
    });

    fetch(`/api/collections?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: CollectionsResponse) => {
        if (!active) return;
        setCollections(data.data ?? []);
      })
      .catch(() => {
        if (!active) return;
      })
      .finally(() => {
        if (!active) return;
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { collections, isLoading };
}
