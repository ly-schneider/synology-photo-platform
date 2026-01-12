"use client";

import { useCallback, useState } from "react";

type SwipeDirection = "horizontal" | "vertical" | null;

type SwipeHandlers = {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeDown?: () => void;
  canSwipeLeft?: boolean;
  canSwipeRight?: boolean;
};

const HORIZONTAL_THRESHOLD = 50;
const VERTICAL_THRESHOLD = 100;
const DIRECTION_DETECTION_THRESHOLD = 10;

export function useSwipeGesture(handlers: SwipeHandlers) {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [touchDelta, setTouchDelta] = useState({ x: 0, y: 0 });
  const [swipeDirection, setSwipeDirection] = useState<SwipeDirection>(null);

  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeDown,
    canSwipeLeft = true,
    canSwipeRight = true,
  } = handlers;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    setTouchDelta({ x: 0, y: 0 });
    setSwipeDirection(null);
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (touchStart === null) return;

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const deltaX = currentX - touchStart.x;
      const deltaY = currentY - touchStart.y;

      let direction = swipeDirection;
      if (
        direction === null &&
        (Math.abs(deltaX) > DIRECTION_DETECTION_THRESHOLD ||
          Math.abs(deltaY) > DIRECTION_DETECTION_THRESHOLD)
      ) {
        direction =
          Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";
        setSwipeDirection(direction);
      }

      if (direction === "horizontal") {
        let finalDeltaX = deltaX;
        if (!canSwipeRight && deltaX > 0) {
          finalDeltaX = deltaX * 0.3;
        } else if (!canSwipeLeft && deltaX < 0) {
          finalDeltaX = deltaX * 0.3;
        }
        setTouchDelta({ x: finalDeltaX, y: 0 });
      } else if (direction === "vertical") {
        const finalDeltaY = deltaY > 0 ? deltaY : deltaY * 0.3;
        setTouchDelta({ x: 0, y: finalDeltaY });
      }
    },
    [touchStart, swipeDirection, canSwipeLeft, canSwipeRight],
  );

  const handleTouchEnd = useCallback(() => {
    if (swipeDirection === "horizontal") {
      if (touchDelta.x > HORIZONTAL_THRESHOLD && canSwipeRight) {
        onSwipeRight?.();
      } else if (touchDelta.x < -HORIZONTAL_THRESHOLD && canSwipeLeft) {
        onSwipeLeft?.();
      }
    } else if (swipeDirection === "vertical") {
      if (touchDelta.y > VERTICAL_THRESHOLD) {
        onSwipeDown?.();
      }
    }

    setTouchStart(null);
    setTouchDelta({ x: 0, y: 0 });
    setSwipeDirection(null);
  }, [
    swipeDirection,
    touchDelta,
    canSwipeLeft,
    canSwipeRight,
    onSwipeLeft,
    onSwipeRight,
    onSwipeDown,
  ]);

  const isAnimating = touchStart === null;

  return {
    touchDelta,
    swipeDirection,
    isAnimating,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchEnd,
    },
  };
}
