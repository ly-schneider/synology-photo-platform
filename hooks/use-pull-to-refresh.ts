"use client";

import { useCallback, useRef, useState } from "react";

const THRESHOLD = 80;
const RESISTANCE = 2.5;

type UsePullToRefreshOptions = {
  onRefresh: () => Promise<void>;
  isRefreshing?: boolean;
};

export function usePullToRefresh({
  onRefresh,
  isRefreshing = false,
}: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const isTrackingRef = useRef(false);

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const shouldTrigger = pullDistance >= THRESHOLD;

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (isRefreshing) return;

      // Only start tracking if at the top of the scroll container
      const target = e.currentTarget;
      if (target.scrollTop > 0) return;

      startYRef.current = e.touches[0].clientY;
      currentYRef.current = startYRef.current;
      isTrackingRef.current = true;
    },
    [isRefreshing],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isTrackingRef.current || isRefreshing) return;

      const target = e.currentTarget;
      if (target.scrollTop > 0) {
        // User scrolled down, stop tracking
        isTrackingRef.current = false;
        setIsPulling(false);
        setPullDistance(0);
        return;
      }

      currentYRef.current = e.touches[0].clientY;
      const deltaY = currentYRef.current - startYRef.current;

      if (deltaY > 0) {
        // Pulling down
        setIsPulling(true);
        const distance = deltaY / RESISTANCE;
        setPullDistance(distance);
      } else {
        setIsPulling(false);
        setPullDistance(0);
      }
    },
    [isRefreshing],
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isTrackingRef.current) return;

    isTrackingRef.current = false;
    setIsPulling(false);

    if (shouldTrigger && !isRefreshing) {
      setPullDistance(THRESHOLD);
      await onRefresh();
    }

    setPullDistance(0);
  }, [shouldTrigger, isRefreshing, onRefresh]);

  return {
    pullDistance,
    isPulling,
    progress,
    shouldTrigger,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}
