"use client";

import { useSwipeGesture } from "@/hooks/use-swipe-gesture";
import type { Item } from "@/types/api";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ReportModal } from "./report-modal";
import { ShareModal } from "./share-modal";
import { ViewerHeader } from "./viewer-header";
import { ViewerNavigation } from "./viewer-navigation";

function trackItemView(itemId: string, itemFilename: string) {
  fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "item_view",
      itemId,
      itemFilename,
    }),
  }).catch(() => {});
}

type PhotoViewerProps = {
  item: Item;
  isImageLoading: boolean;
  hasPrevious: boolean;
  hasNext: boolean;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onImageLoad: () => void;
  onReportSuccess: (itemId: string) => void;
};

export function PhotoViewer({
  item,
  isImageLoading,
  hasPrevious,
  hasNext,
  onClose,
  onPrevious,
  onNext,
  onImageLoad,
  onReportSuccess,
}: PhotoViewerProps) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const lastTrackedRef = useRef<string | null>(null);

  useEffect(() => {
    if (item.id && lastTrackedRef.current !== item.id) {
      lastTrackedRef.current = item.id;
      trackItemView(item.id, item.filename);
    }
  }, [item.id, item.filename]);

  const { touchDelta, swipeDirection, isAnimating, handlers } = useSwipeGesture(
    {
      onSwipeLeft: onNext,
      onSwipeRight: onPrevious,
      onSwipeDown: onClose,
      canSwipeLeft: hasNext,
      canSwipeRight: hasPrevious,
    },
  );

  const imageUrl = useMemo(() => {
    const baseUrl = item.downloadUrl ?? `/api/items/${item.id}/download`;

    // Ensure we request the image inline so analytics don't treat views as downloads
    if (typeof window !== "undefined") {
      try {
        const url = new URL(baseUrl, window.location.origin);
        url.searchParams.set("disposition", "inline");
        return url.toString();
      } catch {
        // fall through to string concatenation
      }
    }

    const hasDisposition = /[?&]disposition=/.test(baseUrl);
    if (hasDisposition) {
      return baseUrl.replace(/disposition=[^&]*/g, "disposition=inline");
    }

    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}disposition=inline`;
  }, [item.downloadUrl, item.id]);

  const containerOpacity =
    swipeDirection === "vertical" ? Math.max(0, 1 - touchDelta.y / 300) : 1;

  const imageTransform =
    swipeDirection === "horizontal"
      ? `translateX(${touchDelta.x}px)`
      : swipeDirection === "vertical"
        ? `translateY(${touchDelta.y}px) scale(${Math.max(0.9, 1 - touchDelta.y / 1000)})`
        : "none";

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <ViewerHeader
        onClose={onClose}
        onReport={() => setShowReportModal(true)}
        onShare={() => setShowShareModal(true)}
      />

      <div
        className="relative flex h-full w-full items-center justify-center p-4 select-none"
        style={{
          touchAction: "none",
          opacity: containerOpacity,
          transition: isAnimating ? "opacity 0.2s" : "none",
        }}
        {...handlers}
      >
        {isImageLoading && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="aspect-[3/2] w-full max-w-full max-h-full animate-pulse rounded-2xl bg-white/10" />
          </div>
        )}
        <Image
          key={item.id}
          src={imageUrl}
          alt={item.filename}
          fill
          sizes="100vw"
          className={`object-contain ${isImageLoading ? "opacity-0" : "opacity-100"}`}
          unoptimized
          style={{
            transform: imageTransform,
            transition: isAnimating
              ? "transform 0.2s ease-out, opacity 0.2s"
              : "opacity 0.2s",
          }}
          onLoadingComplete={onImageLoad}
          draggable={false}
        />
      </div>

      <ViewerNavigation
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        onPrevious={onPrevious}
        onNext={onNext}
      />

      {showShareModal && (
        <ShareModal item={item} onClose={() => setShowShareModal(false)} />
      )}

      {showReportModal && (
        <ReportModal
          item={item}
          onClose={() => setShowReportModal(false)}
          onReportSuccess={onReportSuccess}
        />
      )}
    </div>
  );
}
