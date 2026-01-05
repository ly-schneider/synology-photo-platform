"use client";

import { useEffect, useRef, useState, type SetStateAction } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { Collection, Item } from "@/lib/api/proxyUtils";

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

export default function HomePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const pathParam = searchParams.get(PATH_PARAM);

  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [collectionsError, setCollectionsError] = useState<string | null>(null);

  const [collectionPath, setCollectionPath] = useState<Collection[]>([]);
  const collectionPathRef = useRef<Collection[]>([]);
  const pendingPathRef = useRef<string | null>(null);
  const selectedCollection = collectionPath[collectionPath.length - 1] ?? null;
  const [folders, setFolders] = useState<Collection[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);

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
  }, [
    collectionPath,
    pathname,
    router,
    searchParams,
    searchParamsString,
  ]);

  useEffect(() => {
    if (selectedCollection) return;
    setFolders([]);
    setItems([]);
    setItemsLoading(false);
    setItemsError(null);
  }, [selectedCollection]);

  useEffect(() => {
    let active = true;
    setCollectionsLoading(true);
    setCollectionsError(null);

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
        setCollectionsError("Could not load collections.");
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
    setItemsError(null);
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
        setItemsError("Could not load items.");
      })
      .finally(() => {
        if (!active) return;
        setItemsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedCollection]);

  return (
    <main className="flex-1 bg-gradient-to-b from-background via-background to-muted/40">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-12 pt-6">
        <header className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Synology Photos
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Browse, preview, and download
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Tap a collection to explore its contents. Downloads are streamed directly from your
            Synology instance.
          </p>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {selectedCollection ? (
            <Button
              variant="ghost"
              onClick={() => updateCollectionPath((prev) => prev.slice(0, -1))}
            >
              {collectionPath.length > 1 ? "Back to folder" : "Back to collections"}
            </Button>
          ) : null}
        </div>

        <Separator />

        {!selectedCollection ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Collections</h2>
              <Badge variant="secondary">
                {collectionsLoading ? "Loading" : `${collections.length} total`}
              </Badge>
            </div>

            {collectionsError ? (
              <Card>
                <CardContent className="p-6 text-sm text-muted-foreground">
                  {collectionsError}
                </CardContent>
              </Card>
            ) : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {collectionsLoading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <Card key={`collection-skeleton-${index}`} className="overflow-hidden">
                      <AspectRatio ratio={4 / 3}>
                        <Skeleton className="h-full w-full" />
                      </AspectRatio>
                      <CardContent className="space-y-2 p-4">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </CardContent>
                    </Card>
                  ))
                : collections.map((collection) => (
                    <button
                      key={collection.id}
                      className="text-left"
                      onClick={() => updateCollectionPath([collection])}
                    >
                      <Card className="overflow-hidden transition hover:border-foreground/20">
                        <AspectRatio ratio={4 / 3}>
                          {collection.coverThumbnailUrl ? (
                            <img
                              src={collection.coverThumbnailUrl}
                              alt={collection.title}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                              No cover
                            </div>
                          )}
                        </AspectRatio>
                        <CardContent className="space-y-2 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold">{collection.title}</p>
                            <Badge variant="outline">{collection.itemCount} items</Badge>
                          </div>
                          {collection.description ? (
                            <p className="text-xs text-muted-foreground">
                              {collection.description}
                            </p>
                          ) : null}
                        </CardContent>
                      </Card>
                    </button>
                  ))}
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Folder
                </p>
                <h2 className="text-lg font-semibold">{selectedCollection.title}</h2>
              </div>
              <Badge variant="secondary">
                {itemsLoading
                  ? "Loading"
                  : `${folders.length} folders • ${items.length} items`}
              </Badge>
            </div>

            {itemsError ? (
              <Card>
                <CardContent className="p-6 text-sm text-muted-foreground">
                  {itemsError}
                </CardContent>
              </Card>
            ) : null}

            {folders.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Folders</h3>
                  <Badge variant="outline">{folders.length} total</Badge>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {folders.map((folder) => (
                    <button
                      key={folder.id}
                      className="text-left"
                      onClick={() => updateCollectionPath((prev) => [...prev, folder])}
                    >
                      <Card className="overflow-hidden transition hover:border-foreground/20">
                        <AspectRatio ratio={4 / 3}>
                          {folder.coverThumbnailUrl ? (
                            <img
                              src={folder.coverThumbnailUrl}
                              alt={folder.title}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                              No cover
                            </div>
                          )}
                        </AspectRatio>
                        <CardContent className="space-y-2 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold">{folder.title}</p>
                            <Badge variant="outline">{folder.itemCount} items</Badge>
                          </div>
                          {folder.description ? (
                            <p className="text-xs text-muted-foreground">{folder.description}</p>
                          ) : null}
                        </CardContent>
                      </Card>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {itemsLoading
                ? Array.from({ length: 6 }).map((_, index) => (
                    <Card key={`item-skeleton-${index}`} className="overflow-hidden">
                      <AspectRatio ratio={1}>
                        <Skeleton className="h-full w-full" />
                      </AspectRatio>
                      <CardContent className="space-y-2 p-3">
                        <Skeleton className="h-3 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </CardContent>
                    </Card>
                  ))
                : items.map((item) => (
                    <Card key={item.id} className="overflow-hidden">
                      <AspectRatio ratio={1}>
                        {item.thumbnailUrl ? (
                          <img
                            src={item.thumbnailUrl}
                            alt={item.filename}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                            No preview
                          </div>
                        )}
                      </AspectRatio>
                      <CardContent className="space-y-2 p-3">
                        <p className="truncate text-xs font-medium">{item.filename}</p>
                        <Button asChild size="sm" className="w-full">
                          <a
                            href={item.downloadUrl ?? `/api/items/${item.id}/download`}
                            download={item.filename}
                          >
                            Download
                          </a>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
            </div>

            {!itemsLoading && items.length === 0 && folders.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-sm text-muted-foreground">
                  This collection has no subfolders or items yet.
                </CardContent>
              </Card>
            ) : null}
          </section>
        )}
      </div>
    </main>
  );
}
