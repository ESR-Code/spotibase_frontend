"use client";

import type { CSSProperties } from "react";
import { HotspotMarkerIcon } from "@/app/editor/_components/ui/hotspot-marker-icon";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { resolveHotspotAppearance } from "@/lib/editor/state/preview-appearance-store";
import { findHotspot } from "@/lib/editor/state/preview-hotspots";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import { useUIStore } from "@/lib/editor/state/ui-store";

/** Glass keeps some translucency even at full opacity. */
const GLASS_MAX_ALPHA = 0.6;

export function HotspotHoverTooltip() {
  const tooltip = useUIStore((s) => s.hoverTooltip);
  const showAllLabels = useUIStore((s) => s.previewShowAllLabels);
  const activeId = useUIStore((s) => s.previewActiveHotspotId);
  const hoveredId = useEditorStore((s) => s.hoveredId);

  if (!tooltip || showAllLabels) return null;

  // Pinned labels belong to the selected hotspot; hover labels to the hovered one.
  const hotspotId = tooltip.pinned ? activeId : hoveredId;

  return (
    <HotspotLabel
      key={tooltip.pinned ? `pin-${tooltip.title}` : `hover-${tooltip.title}`}
      hotspotId={hotspotId}
      x={tooltip.x}
      y={tooltip.y}
      title={tooltip.title}
      pinned={tooltip.pinned}
    />
  );
}

export function HotspotLabelOverlay() {
  const showAllLabels = useUIStore((s) => s.previewShowAllLabels);
  const anchors = useUIStore((s) => s.labelAnchors);

  if (!showAllLabels || anchors.length === 0) return null;

  return anchors.map((anchor) => (
    <HotspotLabel
      key={anchor.id}
      hotspotId={anchor.id}
      x={anchor.x}
      y={anchor.y}
      title={anchor.title}
    />
  ));
}

function HotspotLabel({
  hotspotId,
  x,
  y,
  title,
  pinned,
}: {
  hotspotId: number | null;
  x: number;
  y: number;
  title: string;
  pinned?: boolean;
}) {
  const style = useSettingsStore((s) => s.hotspotLabelStyle);
  const opacity = useSettingsStore((s) => s.hotspotLabelOpacity);
  const labelColor = useSettingsStore((s) => s.hotspotLabelColor);
  const textColor = useSettingsStore((s) => s.hotspotLabelTextColor);
  const borderColor = useSettingsStore((s) => s.hotspotLabelBorderColor);

  const found = hotspotId != null ? findHotspot(hotspotId) : undefined;
  const hotspot = found ? resolveHotspotAppearance(found, true) : undefined;
  const alpha = style === "glass" ? opacity * GLASS_MAX_ALPHA : opacity;
  const background = `color-mix(in srgb, ${labelColor} ${Math.round(alpha * 100)}%, transparent)`;

  return (
    <div
      className={`editor-hover-tooltip editor-hotspot-label-${style} pointer-events-none absolute z-20 ${
        pinned ? "editor-hover-tooltip-pinned" : ""
      }`}
      style={
        {
          left: x,
          top: y,
          background,
          color: textColor,
          borderColor,
          "--editor-label-bg": background,
          "--editor-label-accent": hotspot?.color || borderColor,
        } as CSSProperties
      }
    >
      {style !== "classic" && hotspot ? (
        hotspot.style === "icon" && hotspot.icon ? (
          <span className="editor-hotspot-label-icon">
            <HotspotMarkerIcon icon={hotspot.icon} />
          </span>
        ) : (
          <span className="editor-hotspot-label-icon editor-hotspot-label-dot" />
        )
      ) : null}
      {title}
    </div>
  );
}
