"use client";

import { useSettingsStore } from "@/lib/editor/state/settings-store";
import { useUIStore } from "@/lib/editor/state/ui-store";

export function HotspotHoverTooltip() {
  const tooltip = useUIStore((s) => s.hoverTooltip);
  const labelColor = useSettingsStore((s) => s.hotspotLabelColor);
  const textColor = useSettingsStore((s) => s.hotspotLabelTextColor);
  const borderColor = useSettingsStore((s) => s.hotspotLabelBorderColor);

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
        background: labelColor,
        color: textColor,
        borderColor,
      }}
    >
      {tooltip.title}
    </div>
  );
}
