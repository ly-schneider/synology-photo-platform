"use client";

import { Cancel01Icon, Download01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

type ViewerHeaderProps = {
  onClose: () => void;
  onShare: () => void;
};

export function ViewerHeader({ onClose, onShare }: ViewerHeaderProps) {
  return (
    <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4">
      <button
        onClick={onClose}
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm transition-colors active:bg-white/20"
      >
        <HugeiconsIcon icon={Cancel01Icon} className="h-5 w-5 text-white" />
      </button>
      <button
        onClick={onShare}
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm transition-colors active:bg-white/20"
      >
        <HugeiconsIcon icon={Download01Icon} className="h-5 w-5 text-white" />
      </button>
    </div>
  );
}
