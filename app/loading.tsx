"use client";

import { DotsRing } from "@/components/loading-ui/dots-ring";

export function DotsRingDemo() {
  return <DotsRing className="size-16" />;
}

export default function Loading() {
  return (
    <div style={{ display: "flex", minHeight: "80vh", width: "100%", alignItems: "center", justifyContent: "center" }}>
      <DotsRingDemo />
    </div>
  );
}
