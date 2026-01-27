"use client";

import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { Refresh04Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";

type PullToRefreshContainerProps = {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  isRefreshing?: boolean;
};

export function PullToRefreshContainer({
  children,
  onRefresh,
  isRefreshing = false,
}: PullToRefreshContainerProps) {
  const { pullDistance, isPulling, progress, handlers } = usePullToRefresh({
    onRefresh,
    isRefreshing,
  });

  const showIndicator = isPulling || isRefreshing;
  const indicatorHeight = isRefreshing ? 48 : pullDistance;

  return (
    <div className="relative h-full overflow-auto" {...handlers}>
      {/* Pull indicator */}
      <div
        className="absolute left-0 right-0 top-0 flex items-center justify-center overflow-hidden transition-opacity duration-200"
        style={{
          height: indicatorHeight,
          opacity: showIndicator ? 1 : 0,
        }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            transform: `rotate(${progress * 180}deg)`,
          }}
        >
          <HugeiconsIcon
            icon={Refresh04Icon}
            className={`h-6 w-6 text-muted-foreground ${isRefreshing ? "animate-spin" : ""}`}
          />
        </div>
      </div>

      {/* Content with transform during pull */}
      <div
        className="transition-transform duration-200 ease-out"
        style={{
          transform:
            showIndicator || isRefreshing
              ? `translateY(${indicatorHeight}px)`
              : "translateY(0)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
