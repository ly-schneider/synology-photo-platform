"use client";

import { useSyncExternalStore } from "react";

type Platform = "ios" | "other";

function getPlatform(): Platform {
  if (typeof navigator === "undefined") {
    return "other";
  }

  const userAgent = navigator.userAgent || navigator.vendor || "";
  const isIOS =
    /iPad|iPhone|iPod/.test(userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  return isIOS ? "ios" : "other";
}

function subscribe() {
  // Platform doesn't change, no-op subscription
  return () => {};
}

export function usePlatform(): Platform {
  return useSyncExternalStore(
    subscribe,
    getPlatform,
    () => "other", // Server snapshot
  );
}
