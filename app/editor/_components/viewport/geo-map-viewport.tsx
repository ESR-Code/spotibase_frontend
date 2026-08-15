"use client";

import "@/lib/editor/geo/init-maplibre";
import { useMemo, useState } from "react";
import {
  Map,
  useMap,
  type MapViewport,
} from "@/components/ui/map";
import { GeoHotspotMarker } from "@/app/editor/_components/viewport/geo-hotspot-marker";
import {
  handleGeoMarkerClick,
  handleGeoMarkerEnter,
  handleGeoMarkerLeave,
  useGeoMapEditor,
} from "@/lib/editor/hooks/use-geo-map-editor";
import { resolveGeoHomeViewport } from "@/lib/editor/geo/resolve-home-viewport";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useGeoStore } from "@/lib/editor/state/geo-store";
import { useMapViewportStore } from "@/lib/editor/state/map-viewport-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import { useUIStore } from "@/lib/editor/state/ui-store";
import { LEGEND_CATEGORY_ALL } from "@/lib/editor/types/legend-category";

function GeoMapBridge() {
  const { map, isLoaded } = useMap();
  useGeoMapEditor(map, isLoaded);
  return null;
}

export function GeoMapViewport() {
  const geo = useGeoStore();
  const resetPosition = useSettingsStore((s) => s.resetPosition);
  const minZoom = useSettingsStore((s) => s.minZoom);
  const maxZoom = useSettingsStore((s) => s.maxZoom);
  const home = useMemo(
    () => resolveGeoHomeViewport(resetPosition, geo),
    [resetPosition, geo],
  );
  const [viewport, setViewport] = useState<MapViewport>(home);
  const hotspots = useEditorStore((s) => s.hotspots);
  const isPreview = useEditorStore((s) => s.isPreview);
  const legendFilter = useUIStore((s) => s.legendFilterCategory);
  const visible = hotspots.filter(
    (hotspot) =>
      !isPreview ||
      legendFilter === LEGEND_CATEGORY_ALL ||
      hotspot.category === legendFilter,
  );

  return (
    <div className="absolute inset-0 overflow-hidden">
      <Map
        theme="dark"
        projection={{ type: "globe" }}
        canvasContextAttributes={{ preserveDrawingBuffer: true }}
        minZoom={minZoom}
        maxZoom={maxZoom}
        viewport={viewport}
        onViewportChange={(next: MapViewport) => {
          setViewport(next);
          useMapViewportStore.getState().setViewport(next);
        }}
      >
        <GeoMapBridge />
        {visible.map((hotspot) => (
          <GeoHotspotMarker
            key={hotspot.id}
            hotspot={hotspot}
            onMarkerClick={(item) => handleGeoMarkerClick(item.id)}
            onMarkerEnter={(item, event) =>
              handleGeoMarkerEnter(item.id, event.clientX, event.clientY)
            }
            onMarkerLeave={(item) => handleGeoMarkerLeave(item.id)}
            onDragEnd={(item, lngLat) => {
              useEditorStore.getState().updateHotspot(item.id, {
                position: { x: lngLat.lng, y: lngLat.lat, z: 0 },
              });
            }}
          />
        ))}
      </Map>
    </div>
  );
}
