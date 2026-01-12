"use client";

import { Folder01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export function EmptyState() {
  return (
    <div className="flex h-40 flex-col items-center justify-center gap-3 text-center">
      <HugeiconsIcon
        icon={Folder01Icon}
        className="h-12 w-12 text-muted-foreground/50"
      />
      <p className="text-sm text-muted-foreground">Dieser Ordner ist leer.</p>
    </div>
  );
}
