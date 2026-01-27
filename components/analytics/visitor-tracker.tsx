"use client";

import { useEffect } from "react";

export function VisitorTracker() {
  useEffect(() => {
    const track = () => {
      fetch("/api/analytics/track", { method: "GET" }).catch(() => {});
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      window.requestIdleCallback(track, { timeout: 2000 });
    } else {
      setTimeout(track, 100);
    }
  }, []);

  return null;
}
