"use client";

import { ArrowLeft02Icon, ArrowRight02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

type ViewerNavigationProps = {
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
};

export function ViewerNavigation({
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
}: ViewerNavigationProps) {
  return (
    <>
      {hasPrevious && (
        <button
          onClick={onPrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm transition-colors active:bg-white/20"
        >
          <HugeiconsIcon
            icon={ArrowLeft02Icon}
            className="h-5 w-5 text-white"
          />
        </button>
      )}
      {hasNext && (
        <button
          onClick={onNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm transition-colors active:bg-white/20"
        >
          <HugeiconsIcon
            icon={ArrowRight02Icon}
            className="h-5 w-5 text-white"
          />
        </button>
      )}
    </>
  );
}
