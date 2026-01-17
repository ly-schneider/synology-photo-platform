"use client";

import { useSwipeGesture } from "@/hooks/use-swipe-gesture";
import type { Item } from "@/types/api";
import Image from "next/image";
import { useState } from "react";
import { ReportModal } from "./report-modal";
import { ShareModal } from "./share-modal";
import { ViewerHeader } from "./viewer-header";
import { ViewerNavigation } from "./viewer-navigation";

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

  const { touchDelta, swipeDirection, isAnimating, handlers } = useSwipeGesture(
    {
      onSwipeLeft: onNext,
      onSwipeRight: onPrevious,
      onSwipeDown: onClose,
      canSwipeLeft: hasNext,
      canSwipeRight: hasPrevious,
    },
  );

  const imageUrl = item.downloadUrl ?? `/api/items/${item.id}/download`;

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
