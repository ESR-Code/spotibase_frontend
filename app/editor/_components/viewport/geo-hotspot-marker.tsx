"use client";

import { MapMarker, MarkerContent } from "@/components/ui/map";
import { HotspotMarkerIcon } from "@/app/editor/_components/ui/hotspot-marker-icon";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import {
  resolveHotspotAppearance,
  usePreviewAppearanceStore,
} from "@/lib/editor/state/preview-appearance-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import {
  HOTSPOT_PIN_HOLE_PATH,
  HOTSPOT_PIN_PATH,
  hotspotShapeClass,
} from "@/lib/editor/theme/hotspot-shape";
import { hotspotTypeColors } from "@/lib/editor/theme/tokens";
import {
  isHiddenHotspotStyle,
  normalizeHotspotShape,
  type Hotspot,
} from "@/lib/editor/types/hotspot";
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
  const styleHidden = isHiddenHotspotStyle(resolved.style);
  const fullyHidden = hidden || (isPreview && styleHidden);
  const isPin = normalizeHotspotShape(resolved.shape) === "pin";
  const pinHole =
    isPin &&
    !styleHidden &&
    resolved.style !== "number" &&
    resolved.style !== "icon" &&
    resolved.style !== "image";
  const draggable = !fullyHidden && !isPreview && mode === "select";
  const lng = hotspot.position.x;
  const lat = hotspot.position.y;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;

  return (
    <MapMarker
      longitude={lng}
      latitude={lat}
      draggable={draggable}
      onClick={(event) => {
        if (fullyHidden) return;
        event.stopPropagation();
        onMarkerClick(hotspot, event);
      }}
      onMouseEnter={(event) => {
        if (fullyHidden) return;
        onMarkerEnter(hotspot, event);
      }}
      onMouseLeave={(event) => {
        onMarkerLeave(hotspot, event);
      }}
      onDragEnd={(lngLat) => {
        if (fullyHidden) return;
        onDragEnd(hotspot, lngLat);
      }}
    >
      <MarkerContent
        className={cn(
          "editor-geo-marker-wrap",
          fullyHidden && "editor-geo-marker-hidden",
        )}
      >
        <div
          className={cn(
            "editor-geo-marker",
            hotspotShapeClass(resolved.shape),
            resolved.wick && !styleHidden && "editor-geo-marker-has-wick",
            resolved.pulse && !fullyHidden && !styleHidden && "editor-geo-marker-pulse",
            selected && "editor-geo-marker-selected",
            styleHidden && !isPreview && "editor-geo-marker-ghost",
          )}
          style={
            {
              "--geo-marker-color": color,
              transform: isPin
                ? `translateY(-50%) scale(${scale})`
                : `scale(${scale})`,
            } as React.CSSProperties
          }
        >
          <span
            className={cn(
              "editor-geo-marker-stick",
              (!resolved.wick || styleHidden) && "editor-geo-marker-stick-hidden",
            )}
          />
          <span className="editor-geo-marker-core">
            {isPin ? (
              <svg
                className="editor-geo-marker-pin-svg"
                viewBox="0 0 100 130"
                aria-hidden
              >
                <path
                  d={pinHole ? HOTSPOT_PIN_HOLE_PATH : HOTSPOT_PIN_PATH}
                  fill="currentColor"
                  fillRule={pinHole ? "evenodd" : "nonzero"}
                  stroke={pinHole ? "none" : "#fff"}
                  strokeWidth={pinHole ? 0 : 6}
                  strokeLinejoin="round"
                />
              </svg>
            ) : null}
            {styleHidden ? null : resolved.style === "number" ? (
              <span className="editor-geo-marker-label editor-marker-shape-content">
                {resolved.number}
              </span>
            ) : resolved.style === "icon" ? (
              <span className="editor-geo-marker-label editor-marker-shape-content">
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
