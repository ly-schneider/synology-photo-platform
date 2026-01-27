"use client";

import dynamic from "next/dynamic";

const A2HSNudge = dynamic(
  () => import("@/components/pwa/a2hs-nudge").then((mod) => mod.A2HSNudge),
  { ssr: false }
);

export function DeferredComponents() {
  return <A2HSNudge />;
}
