"use client";

import { useUIStore } from "@/lib/editor/state/ui-store";

export function HotspotHoverTooltip() {
  const tooltip = useUIStore((s) => s.hoverTooltip);
  if (!tooltip) return null;

  return (
    <div
      className="editor-hover-tooltip pointer-events-none absolute z-20"
      style={{
        left: tooltip.x,
        top: tooltip.y,
        transform: "translate(12px, -50%)",
      }}
    >
      {tooltip.title}
    </div>
  );
}
