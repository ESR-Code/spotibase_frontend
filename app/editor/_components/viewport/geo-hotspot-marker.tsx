"use client";

import { MapMarker, MarkerContent } from "@/components/ui/map";
import { HotspotMarkerIcon } from "@/app/editor/_components/ui/hotspot-marker-icon";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import {
  resolveHotspotAppearance,
  usePreviewAppearanceStore,
} from "@/lib/editor/state/preview-appearance-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import { hotspotTypeColors } from "@/lib/editor/theme/tokens";
import type { Hotspot } from "@/lib/editor/types/hotspot";
import { cn } from "@/lib/utils";

type GeoHotspotMarkerProps = {
  hotspot: Hotspot;
  /** Keep the MapLibre marker mounted but invisible/non-interactive. */
  hidden?: boolean;
  onMarkerClick: (hotspot: Hotspot, event: MouseEvent) => void;
  onMarkerEnter: (hotspot: Hotspot, event: MouseEvent) => void;
  onMarkerLeave: (hotspot: Hotspot, event: MouseEvent) => void;
  onDragEnd: (hotspot: Hotspot, lngLat: { lng: number; lat: number }) => void;
};

export function GeoHotspotMarker({
  hotspot,
  hidden = false,
  onMarkerClick,
  onMarkerEnter,
  onMarkerLeave,
  onDragEnd,
}: GeoHotspotMarkerProps) {
  const selectedId = useEditorStore((s) => s.selectedId);
  const hoveredId = useEditorStore((s) => s.hoveredId);
  const isPreview = useEditorStore((s) => s.isPreview);
  const mode = useEditorStore((s) => s.mode);
  const appearanceOverride = usePreviewAppearanceStore(
    (s) => s.overrides[hotspot.id],
  );
  const hotspotSize = useSettingsStore((s) => s.hotspotSize);
  const resolved = resolveHotspotAppearance(hotspot, isPreview);
  // Keep subscription so color/icon overrides re-render this marker.
  void appearanceOverride;
  const selected = selectedId === hotspot.id;
  const hovered = hoveredId === hotspot.id;
  const color = resolved.color || hotspotTypeColors[resolved.type];
  const scale = Math.max(0.55, hotspotSize) * (selected || hovered ? 1.15 : 1);
  const draggable = !hidden && !isPreview && mode === "select";
  const lng = hotspot.position.x;
  const lat = hotspot.position.y;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;

  return (
    <MapMarker
      longitude={lng}
      latitude={lat}
      draggable={draggable}
      onClick={(event) => {
        if (hidden) return;
        event.stopPropagation();
        onMarkerClick(hotspot, event);
      }}
      onMouseEnter={(event) => {
        if (hidden) return;
        onMarkerEnter(hotspot, event);
      }}
      onMouseLeave={(event) => {
        onMarkerLeave(hotspot, event);
      }}
      onDragEnd={(lngLat) => {
        if (hidden) return;
        onDragEnd(hotspot, lngLat);
      }}
    >
      <MarkerContent
        className={cn(
          "editor-geo-marker-wrap",
          hidden && "editor-geo-marker-hidden",
        )}
      >
        <div
          className={cn(
            "editor-geo-marker",
            resolved.pulse && !hidden && "editor-geo-marker-pulse",
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
            {resolved.style === "number" ? (
              <span className="editor-geo-marker-label">{resolved.number}</span>
            ) : resolved.style === "icon" ? (
              <span className="editor-geo-marker-label">
                <HotspotMarkerIcon
                  icon={resolved.icon}
                  className="h-3.5 w-3.5"
                />
              </span>
            ) : resolved.style === "image" && resolved.markerImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={resolved.markerImage} alt="" />
            ) : null}
          </span>
        </div>
      </MarkerContent>
    </MapMarker>
  );
}
