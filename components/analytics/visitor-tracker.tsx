"use client";

import { useEffect } from "react";

export function VisitorTracker() {
  useEffect(() => {
    fetch("/api/analytics/track", { method: "GET" }).catch(() => {});
  }, []);

  return null;
}
