"use client";

import type { Collection, CollectionItemsResponse, Item } from "@/types/api";
import { useEffect, useState } from "react";

const DEFAULT_LIMIT = 200;

export function useCollectionItems(collectionId: string | null) {
  const [folders, setFolders] = useState<Collection[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loadedCollectionId, setLoadedCollectionId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!collectionId) return;
    let active = true;

    const params = new URLSearchParams({
      offset: "0",
      limit: String(DEFAULT_LIMIT),
      additional: '["thumbnail"]',
    });

    fetch(`/api/collections/${collectionId}/items?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: CollectionItemsResponse) => {
        if (!active) return;
        setFolders(data.folders ?? []);
        setItems(data.items ?? []);
        setLoadedCollectionId(collectionId);
      })
      .catch(() => {
        if (!active) return;
        setFolders([]);
        setItems([]);
        setLoadedCollectionId(collectionId);
      });

    return () => {
      active = false;
    };
  }, [collectionId]);

  const isReady = collectionId !== null && loadedCollectionId === collectionId;
  const isLoading = collectionId !== null && !isReady;

  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  return { folders, items, isLoading, isReady, removeItem };
}
