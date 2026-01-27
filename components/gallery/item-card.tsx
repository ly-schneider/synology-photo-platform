"use client";

import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Folder01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";

type ItemCardProps = {
  thumbnailUrl: string | null;
  filename: string;
  onClick: () => void;
  priority?: boolean;
};

export function ItemCard({ thumbnailUrl, filename, onClick, priority = false }: ItemCardProps) {
  return (
    <button onClick={onClick} className="group relative text-left">
      <AspectRatio ratio={1} className="relative">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={filename}
            fill
            sizes="(max-width: 768px) 33vw, (max-width: 1200px) 20vw, 200px"
            className="rounded-sm object-cover"
            priority={priority}
            loading={priority ? undefined : "lazy"}
            unoptimized
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
  );
}
