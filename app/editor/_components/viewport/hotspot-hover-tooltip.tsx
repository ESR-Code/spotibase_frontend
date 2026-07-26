"use client";

import { useUIStore } from "@/lib/editor/state/ui-store";

export function HotspotHoverTooltip() {
  const tooltip = useUIStore((s) => s.hoverTooltip);
  if (!tooltip) return null;

  return (
    <div
      key={tooltip.pinned ? `pin-${tooltip.title}` : `hover-${tooltip.title}`}
      className={`editor-hover-tooltip pointer-events-none absolute z-20 ${
        tooltip.pinned ? "editor-hover-tooltip-pinned" : ""
      }`}
      style={{
        left: tooltip.x,
        top: tooltip.y,
      }}
    >
      {tooltip.title}
    </div>
  );
}
