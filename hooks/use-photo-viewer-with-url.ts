"use client";

import type { Item } from "@/types/api";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { usePhotoViewer } from "./use-photo-viewer";

export function usePhotoViewerWithUrl(items: Item[], isReady: boolean) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const baseViewer = usePhotoViewer(items.length);
  const initializedRef = useRef(false);
  const lastSyncedIndexRef = useRef<number | null>(null);

  const updateUrl = useCallback(
    (itemId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (itemId) {
        params.set("img", itemId);
      } else {
        params.delete("img");
      }
      const newUrl = params.toString() ? `${pathname}?${params}` : pathname;
      window.history.replaceState(null, "", newUrl);
    },
    [pathname, searchParams],
  );

  useEffect(() => {
    if (!initializedRef.current) return;
    if (lastSyncedIndexRef.current === baseViewer.viewerIndex) return;

    lastSyncedIndexRef.current = baseViewer.viewerIndex;

    if (baseViewer.viewerIndex === null) {
      updateUrl(null);
    } else {
      const item = items[baseViewer.viewerIndex];
      updateUrl(item?.id ?? null);
    }
  }, [baseViewer.viewerIndex, items, updateUrl]);

  useEffect(() => {
    if (initializedRef.current || !isReady) return;

    const imgParam = searchParams.get("img");
    if (imgParam) {
      const index = items.findIndex((item) => item.id === imgParam);
      if (index !== -1) {
        baseViewer.open(index);
        lastSyncedIndexRef.current = index;
      } else {
        updateUrl(null);
      }
    }
    initializedRef.current = true;
  }, [items, isReady, searchParams, baseViewer, updateUrl]);

  return baseViewer;
}
