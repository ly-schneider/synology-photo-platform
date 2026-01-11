"use client";

import { useEffect, useRef, useState, type SetStateAction } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Skeleton } from "@/components/ui/skeleton";
import type { Collection, Item } from "@/lib/api/proxyUtils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowLeft02Icon,
  ArrowRight02Icon,
  Cancel01Icon,
  Download01Icon,
  Folder01Icon,
} from "@hugeicons/core-free-icons";

type ApiCollectionResponse = {
  data: Collection[];
  page: { offset: number; limit: number; total: number };
};

type ApiCollectionItemsResponse = {
  folders: Collection[];
  items: Item[];
  foldersPage: { offset: number; limit: number; total: number };
  page: { offset: number; limit: number; total: number };
};

const DEFAULT_LIMIT = 200;
const PATH_PARAM = "path";
const PATH_SEPARATOR = ",";

function parsePathParam(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(PATH_SEPARATOR)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function createPlaceholderCollection(id: string): Collection {
  return {
    id,
    type: "folder",
    title: `Folder ${id}`,
    description: null,
    itemCount: 0,
    coverItemId: null,
    coverThumbnailUrl: null,
    createdAt: null,
    updatedAt: null,
  };
}

function getFolderDisplayName(title: string): string {
  // Remove leading slash and get only the last segment of the path
  const cleaned = title.replace(/^\/+/, "");
  const segments = cleaned.split("/");
  return segments[segments.length - 1] || cleaned;
}

export default function HomePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const pathParam = searchParams.get(PATH_PARAM);

  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);

  const [collectionPath, setCollectionPath] = useState<Collection[]>([]);
  const collectionPathRef = useRef<Collection[]>([]);
  const pendingPathRef = useRef<string | null>(null);
  const selectedCollection = collectionPath[collectionPath.length - 1] ?? null;
  const [folders, setFolders] = useState<Collection[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [viewerLoading, setViewerLoading] = useState(true);

  // Swipe gesture state
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchDelta, setTouchDelta] = useState({ x: 0, y: 0 });
  const [swipeDirection, setSwipeDirection] = useState<"horizontal" | "vertical" | null>(null);

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareStep, setShareStep] = useState<"intro" | "sharing">("intro");

  const updateCollectionPath = (next: SetStateAction<Collection[]>) => {
    pendingPathRef.current = null;
    setCollectionPath(next);
  };

  useEffect(() => {
    collectionPathRef.current = collectionPath;
  }, [collectionPath]);

  useEffect(() => {
    const ids = parsePathParam(pathParam);
    const currentIds = collectionPathRef.current.map((entry) => entry.id);
    const isSamePath =
      ids.length === currentIds.length && ids.every((id, index) => id === currentIds[index]);

    if (isSamePath) {
      pendingPathRef.current = null;
      return;
    }

    const targetPath = ids.join(PATH_SEPARATOR);
    pendingPathRef.current = targetPath;
    if (ids.length === 0) {
      setCollectionPath([]);
      return;
    }

    setCollectionPath(ids.map((id) => createPlaceholderCollection(id)));
  }, [pathParam]);

  useEffect(() => {
    const pendingPath = pendingPathRef.current;
    if (pendingPath === null) return;
    const currentPath = collectionPath.map((entry) => entry.id).join(PATH_SEPARATOR);
    if (currentPath === pendingPath) {
      pendingPathRef.current = null;
    }
  }, [collectionPath]);

  useEffect(() => {
    if (collections.length === 0 || collectionPath.length === 0) return;
    const rootMatch = collections.find((collection) => collection.id === collectionPath[0].id);
    if (!rootMatch) return;
    setCollectionPath((prev) => {
      if (prev.length === 0 || prev[0].id !== rootMatch.id) return prev;
      if (prev[0].title === rootMatch.title) return prev;
      const next = [...prev];
      next[0] = rootMatch;
      return next;
    });
  }, [collections, collectionPath]);

  useEffect(() => {
    if (pendingPathRef.current !== null) return;
    const nextPath = collectionPath.map((entry) => entry.id).join(PATH_SEPARATOR);
    const rawCurrentPath = searchParams.get(PATH_PARAM);
    const currentPath = rawCurrentPath === "" ? null : rawCurrentPath;
    const nextValue = nextPath.length > 0 ? nextPath : null;

    if (nextValue === currentPath && rawCurrentPath !== "") return;

    const params = new URLSearchParams(searchParamsString);
    if (nextValue) {
      params.set(PATH_PARAM, nextValue);
    } else {
      params.delete(PATH_PARAM);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [collectionPath, pathname, router, searchParams, searchParamsString]);

  useEffect(() => {
    if (selectedCollection) return;
    setFolders([]);
    setItems([]);
    setItemsLoading(false);
  }, [selectedCollection]);

  useEffect(() => {
    let active = true;
    setCollectionsLoading(true);

    const params = new URLSearchParams({
      offset: "0",
      limit: String(DEFAULT_LIMIT),
    });

    fetch(`/api/collections?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: ApiCollectionResponse) => {
        if (!active) return;
        setCollections(data.data ?? []);
      })
      .catch(() => {
        if (!active) return;
      })
      .finally(() => {
        if (!active) return;
        setCollectionsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedCollection) return;
    let active = true;
    setItemsLoading(true);
    setFolders([]);
    setItems([]);

    const params = new URLSearchParams({
      offset: "0",
      limit: String(DEFAULT_LIMIT),
      additional: "[\"thumbnail\"]",
    });

    fetch(`/api/collections/${selectedCollection.id}/items?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: ApiCollectionItemsResponse) => {
        if (!active) return;
        setFolders(data.folders ?? []);
        setItems(data.items ?? []);
      })
      .catch(() => {
        if (!active) return;
      })
      .finally(() => {
        if (!active) return;
        setItemsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedCollection]);

  const isLoading = selectedCollection ? itemsLoading : collectionsLoading;
  const showFolders = selectedCollection ? folders : collections;
  const showItems = selectedCollection ? items : [];
  const viewerItem = viewerIndex !== null ? showItems[viewerIndex] : null;

  // Reset loading state when viewer index changes
  useEffect(() => {
    if (viewerIndex !== null) {
      setViewerLoading(true);
    }
  }, [viewerIndex]);

  // Keyboard navigation for viewer
  useEffect(() => {
    if (viewerIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setViewerIndex(null);
      } else if (e.key === "ArrowLeft" && viewerIndex > 0) {
        setViewerIndex(viewerIndex - 1);
      } else if (e.key === "ArrowRight" && viewerIndex < showItems.length - 1) {
        setViewerIndex(viewerIndex + 1);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [viewerIndex, showItems.length]);

  // Swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    setTouchDelta({ x: 0, y: 0 });
    setSwipeDirection(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStart.x;
    const deltaY = currentY - touchStart.y;

    // Determine swipe direction on first significant movement
    if (swipeDirection === null && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
      setSwipeDirection(Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical");
    }

    if (swipeDirection === "horizontal") {
      // Horizontal swipe for navigation
      let finalDeltaX = deltaX;
      if (viewerIndex === 0 && deltaX > 0) {
        finalDeltaX = deltaX * 0.3; // Resistance at start
      } else if (viewerIndex === showItems.length - 1 && deltaX < 0) {
        finalDeltaX = deltaX * 0.3; // Resistance at end
      }
      setTouchDelta({ x: finalDeltaX, y: 0 });
    } else if (swipeDirection === "vertical") {
      // Vertical swipe for closing - only allow downward swipes
      const finalDeltaY = deltaY > 0 ? deltaY : deltaY * 0.3; // Resistance for upward swipe
      setTouchDelta({ x: 0, y: finalDeltaY });
    }
  };

  const handleTouchEnd = () => {
    const HORIZONTAL_THRESHOLD = 50;
    const VERTICAL_THRESHOLD = 100;

    if (swipeDirection === "horizontal") {
      // Navigate between images
      if (touchDelta.x > HORIZONTAL_THRESHOLD && viewerIndex !== null && viewerIndex > 0) {
        setViewerIndex(viewerIndex - 1);
      } else if (touchDelta.x < -HORIZONTAL_THRESHOLD && viewerIndex !== null && viewerIndex < showItems.length - 1) {
        setViewerIndex(viewerIndex + 1);
      }
    } else if (swipeDirection === "vertical") {
      // Close viewer on downward swipe
      if (touchDelta.y > VERTICAL_THRESHOLD) {
        setViewerIndex(null);
      }
    }

    setTouchStart(null);
    setTouchDelta({ x: 0, y: 0 });
    setSwipeDirection(null);
  };

  // Share modal handlers
  const openShareModal = () => {
    setShareStep("intro");
    setShowShareModal(true);
  };

  const closeShareModal = () => {
    setShowShareModal(false);
    setShareStep("intro");
  };

  const handleShare = async () => {
    if (!viewerItem) return;

    setShareStep("sharing");

    try {
      const imageUrl = viewerItem.downloadUrl ?? `/api/items/${viewerItem.id}/download`;
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], viewerItem.filename, { type: blob.type });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: viewerItem.filename,
        });
      } else {
        // Fallback: trigger download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = viewerItem.filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // User cancelled or share failed silently
    }

    closeShareModal();
  };

  return (
    <main className="flex-1 bg-background">
      <div className="mx-auto w-full max-w-lg p-4">
        {/* Back button */}
        {selectedCollection && (
          <button
            onClick={() => updateCollectionPath((prev) => prev.slice(0, -1))}
            className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-muted transition-colors active:bg-muted/70"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="h-5 w-5" />
          </button>
        )}

        {/* Folders grid */}
        {(isLoading || showFolders.length > 0) && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={`folder-skeleton-${i}`} className="flex flex-col items-center gap-2">
                    <div className="w-full">
                      <AspectRatio ratio={1}>
                        <Skeleton className="h-full w-full rounded-2xl" />
                      </AspectRatio>
                    </div>
                    <Skeleton className="h-3 w-2/3 rounded" />
                  </div>
                ))
              : showFolders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() =>
                      selectedCollection
                        ? updateCollectionPath((prev) => [...prev, folder])
                        : updateCollectionPath([folder])
                    }
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className="w-full">
                      <AspectRatio ratio={1}>
                        <div className="flex h-full w-full items-center justify-center rounded-2xl bg-muted transition-colors group-active:bg-muted/70">
                          <HugeiconsIcon
                            icon={Folder01Icon}
                            className="h-8 w-8 text-muted-foreground"
                          />
                        </div>
                      </AspectRatio>
                    </div>
                    <span className="text-xs text-center leading-tight line-clamp-2 px-1">
                      {getFolderDisplayName(folder.title)}
                    </span>
                  </button>
                ))}
          </div>
        )}

        {/* Items grid */}
        {(isLoading || showItems.length > 0) && (
          <div className="grid grid-cols-3 gap-2">
            {isLoading && !selectedCollection
              ? null
              : isLoading
              ? Array.from({ length: 9 }).map((_, i) => (
                  <AspectRatio key={`item-skeleton-${i}`} ratio={1}>
                    <Skeleton className="h-full w-full rounded-2xl" />
                  </AspectRatio>
                ))
              : showItems.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => setViewerIndex(index)}
                    className="group relative text-left"
                  >
                    <AspectRatio ratio={1}>
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.filename}
                          className="h-full w-full rounded-sm object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-2xl bg-muted">
                          <HugeiconsIcon
                            icon={Folder01Icon}
                            className="h-6 w-6 text-muted-foreground"
                          />
                        </div>
                      )}
                    </AspectRatio>
                  </button>
                ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && showFolders.length === 0 && showItems.length === 0 && (
          <div className="flex h-40 flex-col items-center justify-center gap-3 text-center">
            <HugeiconsIcon
              icon={Folder01Icon}
              className="h-12 w-12 text-muted-foreground/50"
            />
            <p className="text-sm text-muted-foreground">Dieser Ordner ist leer.</p>
          </div>
        )}
      </div>

      {/* Fullscreen photo viewer */}
      {viewerItem && (
        <div className="fixed inset-0 z-50 bg-black">
          {/* Header with close and download */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4">
            <button
              onClick={() => setViewerIndex(null)}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm transition-colors active:bg-white/20"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="h-5 w-5 text-white" />
            </button>
            <button
              onClick={openShareModal}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm transition-colors active:bg-white/20"
            >
              <HugeiconsIcon icon={Download01Icon} className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Image */}
          <div
            className="flex h-full w-full items-center justify-center p-4 select-none"
            style={{
              touchAction: "none",
              opacity: swipeDirection === "vertical" ? Math.max(0, 1 - touchDelta.y / 300) : 1,
              transition: touchStart === null ? "opacity 0.2s" : "none",
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            {viewerLoading && (
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="aspect-[3/2] w-full max-w-full max-h-full animate-pulse rounded-2xl bg-white/10" />
              </div>
            )}
            <img
              key={viewerItem.id}
              src={viewerItem.downloadUrl ?? `/api/items/${viewerItem.id}/download`}
              alt={viewerItem.filename}
              className={`max-h-full max-w-full object-contain ${
                viewerLoading ? "opacity-0" : "opacity-100"
              }`}
              style={{
                transform: swipeDirection === "horizontal"
                  ? `translateX(${touchDelta.x}px)`
                  : swipeDirection === "vertical"
                  ? `translateY(${touchDelta.y}px) scale(${Math.max(0.9, 1 - touchDelta.y / 1000)})`
                  : "none",
                transition: touchStart === null ? "transform 0.2s ease-out, opacity 0.2s" : "opacity 0.2s",
              }}
              onLoad={() => setViewerLoading(false)}
              draggable={false}
            />
          </div>

          {/* Navigation arrows */}
          {viewerIndex !== null && viewerIndex > 0 && (
            <button
              onClick={() => setViewerIndex((prev) => (prev !== null ? prev - 1 : null))}
              className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm transition-colors active:bg-white/20"
            >
              <HugeiconsIcon
                icon={ArrowLeft02Icon}
                className="h-5 w-5 text-white"
              />
            </button>
          )}
          {viewerIndex !== null && viewerIndex < showItems.length - 1 && (
            <button
              onClick={() => setViewerIndex((prev) => (prev !== null ? prev + 1 : null))}
              className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm transition-colors active:bg-white/20"
            >
              <HugeiconsIcon
                icon={ArrowRight02Icon}
                className="h-5 w-5 text-white"
              />
            </button>
          )}

          {/* Share Modal */}
          {showShareModal && (
            <div
              className="absolute inset-0 z-20 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
              onClick={closeShareModal}
            >
              <div
                className="w-full max-w-md rounded-t-3xl bg-neutral-900 p-6 pb-10 animate-in slide-in-from-bottom duration-300"
                onClick={(e) => e.stopPropagation()}
              >
                {shareStep === "intro" ? (
                  <div className="flex flex-col items-center gap-6">
                    {/* Animated phone with save icon */}
                    <div className="relative flex h-32 w-20 items-center justify-center">
                      {/* Phone frame */}
                      <div className="absolute inset-0 rounded-2xl border-2 border-white/20 bg-white/5" />
                      {/* Image placeholder inside phone */}
                      <div className="absolute inset-2 rounded-xl bg-gradient-to-br from-blue-500/30 to-purple-500/30" />
                      {/* Animated arrow pointing down */}
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 animate-bounce">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
                          <HugeiconsIcon
                            icon={ArrowDown01Icon}
                            className="h-4 w-4 text-black"
                            strokeWidth={2.5}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Minimal text */}
                    <p className="text-center text-sm text-white/70">
                      Tippe <span className="font-medium text-white">Bild sichern</span>
                    </p>

                    {/* Action button */}
                    <button
                      onClick={handleShare}
                      className="w-full rounded-2xl bg-white py-4 font-medium text-black transition-transform active:scale-[0.98]"
                    >
                      Weiter
                    </button>

                    <button
                      onClick={closeShareModal}
                      className="text-sm text-white/50 transition-colors active:text-white/70"
                    >
                      Abbrechen
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-6 py-8">
                    {/* Loading spinner */}
                    <div className="relative h-12 w-12">
                      <div className="absolute inset-0 rounded-full border-2 border-white/10" />
                      <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-white" />
                    </div>
                    <p className="text-sm text-white/70">Teilen wird geöffnet...</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
