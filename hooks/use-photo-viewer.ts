"use client";

import { useCallback, useEffect, useState } from "react";

export function usePhotoViewer(itemCount: number) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(true);

  const isOpen = viewerIndex !== null;

  const open = useCallback((index: number) => {
    setIsImageLoading(true);
    setViewerIndex(index);
  }, []);

  const close = useCallback(() => {
    setViewerIndex(null);
  }, []);

  const goToPrevious = useCallback(() => {
    setIsImageLoading(true);
    setViewerIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
  }, []);

  const goToNext = useCallback(() => {
    setIsImageLoading(true);
    setViewerIndex((prev) =>
      prev !== null && prev < itemCount - 1 ? prev + 1 : prev,
    );
  }, [itemCount]);

  const onImageLoad = useCallback(() => {
    setIsImageLoading(false);
  }, []);

  const hasPrevious = viewerIndex !== null && viewerIndex > 0;
  const hasNext = viewerIndex !== null && viewerIndex < itemCount - 1;

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
      } else if (e.key === "ArrowLeft" && hasPrevious) {
        goToPrevious();
      } else if (e.key === "ArrowRight" && hasNext) {
        goToNext();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, close, goToPrevious, goToNext, hasPrevious, hasNext]);

  return {
    viewerIndex,
    isOpen,
    isImageLoading,
    hasPrevious,
    hasNext,
    open,
    close,
    goToPrevious,
    goToNext,
    onImageLoad,
  };
}
