"use client";

import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Skeleton } from "@/components/ui/skeleton";
import type { Item } from "@/types/api";
import { ItemCard } from "./item-card";

type ItemGridProps = {
  items: Item[];
  isLoading: boolean;
  onItemClick: (index: number) => void;
};

export function ItemGrid({ items, isLoading, onItemClick }: ItemGridProps) {
  if (!isLoading && items.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {isLoading
        ? Array.from({ length: 9 }).map((_, i) => (
            <AspectRatio key={`item-skeleton-${i}`} ratio={1}>
              <Skeleton className="h-full w-full rounded-2xl" />
            </AspectRatio>
          ))
        : items.map((item, index) => (
            <ItemCard
              key={item.id}
              thumbnailUrl={item.thumbnailUrl ?? null}
              filename={item.filename}
              onClick={() => onItemClick(index)}
            />
          ))}
    </div>
  );
}
