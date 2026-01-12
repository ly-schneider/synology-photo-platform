"use client";

import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Folder01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

type FolderCardProps = {
  name: string;
  onClick: () => void;
};

function getFolderDisplayName(title: string): string {
  const cleaned = title.replace(/^\/+/, "");
  const segments = cleaned.split("/");
  return segments[segments.length - 1] || cleaned;
}

export function FolderCard({ name, onClick }: FolderCardProps) {
  return (
    <button
      onClick={onClick}
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
        {getFolderDisplayName(name)}
      </span>
    </button>
  );
}
