"use client";

import { useEffect } from "react";

export function VisitorTracker() {
  useEffect(() => {
    // Defer analytics tracking to avoid blocking initial render
    const track = () => {
      fetch("/api/analytics/track", { method: "GET" }).catch(() => {});
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      window.requestIdleCallback(track, { timeout: 2000 });
    } else {
      // Fallback for Safari/iOS which doesn't support requestIdleCallback
      setTimeout(track, 100);
    }
  }, []);

  return null;
}
