"use client";

import { MapMarker, MarkerContent } from "@/components/ui/map";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import { hotspotTypeColors } from "@/lib/editor/theme/tokens";
import type { Hotspot } from "@/lib/editor/types/hotspot";
import { cn } from "@/lib/utils";

type GeoHotspotMarkerProps = {
  hotspot: Hotspot;
  onMarkerClick: (hotspot: Hotspot, event: MouseEvent) => void;
  onMarkerEnter: (hotspot: Hotspot, event: MouseEvent) => void;
  onMarkerLeave: (hotspot: Hotspot, event: MouseEvent) => void;
  onDragEnd: (hotspot: Hotspot, lngLat: { lng: number; lat: number }) => void;
};

export function GeoHotspotMarker({
  hotspot,
  onMarkerClick,
  onMarkerEnter,
  onMarkerLeave,
  onDragEnd,
}: GeoHotspotMarkerProps) {
  const selectedId = useEditorStore((s) => s.selectedId);
  const hoveredId = useEditorStore((s) => s.hoveredId);
  const isPreview = useEditorStore((s) => s.isPreview);
  const mode = useEditorStore((s) => s.mode);
  const hotspotSize = useSettingsStore((s) => s.hotspotSize);
  const selected = selectedId === hotspot.id;
  const hovered = hoveredId === hotspot.id;
  const color = hotspot.color || hotspotTypeColors[hotspot.type];
  const scale = Math.max(0.55, hotspotSize) * (selected || hovered ? 1.15 : 1);
  const draggable = !isPreview && mode === "select";

  return (
    <MapMarker
      longitude={hotspot.position.x}
      latitude={hotspot.position.y}
      draggable={draggable}
      onClick={(event) => {
        event.stopPropagation();
        onMarkerClick(hotspot, event);
      }}
      onMouseEnter={(event) => onMarkerEnter(hotspot, event)}
      onMouseLeave={(event) => onMarkerLeave(hotspot, event)}
      onDragEnd={(lngLat) => onDragEnd(hotspot, lngLat)}
    >
      <MarkerContent className="editor-geo-marker-wrap">
        <div
          className={cn(
            "editor-geo-marker",
            hotspot.pulse && "editor-geo-marker-pulse",
            selected && "editor-geo-marker-selected",
          )}
          style={
            {
              "--geo-marker-color": color,
              transform: `scale(${scale})`,
            } as React.CSSProperties
          }
        >
          <span className="editor-geo-marker-stick" />
          <span className="editor-geo-marker-core">
            {hotspot.style === "number" ? (
              <span className="editor-geo-marker-label">{hotspot.number}</span>
            ) : hotspot.style === "icon" ? (
              <span className="editor-geo-marker-label">{hotspot.icon}</span>
            ) : hotspot.style === "image" && hotspot.markerImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hotspot.markerImage} alt="" />
            ) : null}
          </span>
        </div>
      </MarkerContent>
    </MapMarker>
  );
}
