"use client";

import { useEffect, useRef, useState } from "react";
import type { GeoJSONSource, ImageSource, Map as MapLibreMap } from "maplibre-gl";
import { useMap } from "@/components/ui/map";
import {
  geoOverlayQuad,
  geographicBearing,
  overlayQuadPolygon,
} from "@/lib/editor/geo/overlay-quad";
import {
  overlayContentKey,
  overlaySourceImage,
} from "@/lib/editor/layers/blend-overlay-image";
import {
  overlayHitLayerId,
  overlayHitSourceId,
  overlayRasterLayerId,
  overlayRasterSourceId,
} from "@/lib/editor/layers/overlay-ids";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useLayersStore } from "@/lib/editor/state/layers-store";
import {
  isPreviewLayerVisible,
  usePreviewVisibilityStore,
} from "@/lib/editor/state/preview-visibility-store";
import { syncActiveSceneLayers } from "@/lib/editor/state/scenes-store";
import {
  isGeoImageOverlay,
  type ImageOverlayLayer,
} from "@/lib/editor/types/scene-layer";

function removeOverlay(map: MapLibreMap, layerId: string) {
  const rasterId = overlayRasterLayerId(layerId);
  const hitId = overlayHitLayerId(layerId);
  const rasterSrc = overlayRasterSourceId(layerId);
  const hitSrc = overlayHitSourceId(layerId);
  if (map.getLayer(hitId)) map.removeLayer(hitId);
  if (map.getLayer(rasterId)) map.removeLayer(rasterId);
  if (map.getSource(hitSrc)) map.removeSource(hitSrc);
  if (map.getSource(rasterSrc)) map.removeSource(rasterSrc);
}

function visibleGeoOverlays(layers: ReturnType<typeof useLayersStore.getState>["layers"]) {
  return layers
    .filter(isGeoImageOverlay)
    .filter((layer) =>
      isPreviewLayerVisible(
        useEditorStore.getState().isPreview,
        layer.id,
        layer.visible,
      ),
    );
}

export function GeoOverlayLayers() {
  const { map, isLoaded } = useMap();
  const layers = useLayersStore((s) => s.layers);
  const disabledLayerIds = usePreviewVisibilityStore((s) => s.disabledLayerIds);
  const isPreview = useEditorStore((s) => s.isPreview);
  const contentKeysRef = useRef(new Map<string, string>());

  useEffect(() => {
    if (!map || !isLoaded) return;
    let cancelled = false;

    const sync = async () => {
      const wanted = visibleGeoOverlays(layers);
      const wantedIds = new Set(wanted.map((layer) => layer.id));
      const style = map.getStyle();
      if (!style) return;
      const existing = Object.keys(style.sources ?? {}).filter((id) =>
        id.startsWith("editor-overlay-src-"),
      );
      for (const sourceId of existing) {
        const layerId = sourceId.slice("editor-overlay-src-".length);
        if (!wantedIds.has(layerId)) {
          removeOverlay(map, layerId);
          contentKeysRef.current.delete(layerId);
        }
      }

      for (const layer of wanted) {
        const rasterSrc = overlayRasterSourceId(layer.id);
        const rasterId = overlayRasterLayerId(layer.id);
        const hitSrc = overlayHitSourceId(layer.id);
        const hitId = overlayHitLayerId(layer.id);
        const quad = geoOverlayQuad(
          layer.pose,
          layer.naturalWidth,
          layer.naturalHeight,
        );
        const polygon = overlayQuadPolygon(quad);
        const contentKey = overlayContentKey(
          layer.imageDataUrl,
          layer.blend ?? 0,
        );
        const source = map.getSource(rasterSrc) as ImageSource | undefined;
        if (source && contentKeysRef.current.get(layer.id) === contentKey) {
          source.setCoordinates(quad);
          if (map.getLayer(rasterId)) {
            map.setPaintProperty(rasterId, "raster-opacity", layer.opacity);
          }
          (map.getSource(hitSrc) as GeoJSONSource | undefined)?.setData(polygon);
          continue;
        }

        const image = await overlaySourceImage(
          layer.imageDataUrl,
          layer.blend ?? 0,
        );
        if (cancelled) return;
        if (source) {
          source.setCoordinates(quad);
          if (map.getLayer(rasterId)) {
            map.setPaintProperty(rasterId, "raster-opacity", layer.opacity);
          }
          (map.getSource(hitSrc) as GeoJSONSource | undefined)?.setData(polygon);
          if (contentKeysRef.current.get(layer.id) !== contentKey) {
            if (typeof image === "string") {
              source.updateImage({ url: image, coordinates: quad });
            } else {
              source.updateImage({ image, coordinates: quad });
            }
            contentKeysRef.current.set(layer.id, contentKey);
          }
        } else {
          map.addSource(rasterSrc, {
            type: "image",
            url: layer.imageDataUrl,
            coordinates: quad,
          });
          const created = map.getSource(rasterSrc) as ImageSource | undefined;
          if (created && typeof image !== "string") {
            created.updateImage({ image, coordinates: quad });
          }
          contentKeysRef.current.set(layer.id, contentKey);
          map.addLayer({
            id: rasterId,
            type: "raster",
            source: rasterSrc,
            paint: {
              "raster-opacity": layer.opacity,
              "raster-fade-duration": 0,
            },
          });
          map.addSource(hitSrc, { type: "geojson", data: polygon });
          map.addLayer({
            id: hitId,
            type: "fill",
            source: hitSrc,
            paint: {
              "fill-color": "#000000",
              "fill-opacity": 0.01,
            },
          });
        }
      }

      if (cancelled) return;
      for (const layer of wanted) {
        const rasterId = overlayRasterLayerId(layer.id);
        if (map.getLayer(rasterId)) map.moveLayer(rasterId);
      }
      for (const layer of wanted) {
        const hitId = overlayHitLayerId(layer.id);
        if (map.getLayer(hitId)) map.moveLayer(hitId);
      }
    };

    void sync();
    return () => {
      cancelled = true;
    };
  }, [map, isLoaded, layers, disabledLayerIds, isPreview]);

  useEffect(() => {
    if (!map) return;
    return () => {
      if (!map.getStyle()) return;
      const sources = Object.keys(map.getStyle().sources ?? {});
      for (const sourceId of sources) {
        if (sourceId.startsWith("editor-overlay-src-")) {
          removeOverlay(map, sourceId.slice("editor-overlay-src-".length));
        }
      }
    };
  }, [map]);

  return <GeoOverlayGizmo />;
}

type DragState =
  | {
      kind: "move";
      startLng: number;
      startLat: number;
      poseLng: number;
      poseLat: number;
    }
  | { kind: "scale"; startDist: number; startWidth: number }
  | { kind: "rotate" };

function pointerOnMap(
  map: MapLibreMap,
  event: React.PointerEvent,
): { x: number; y: number } {
  const rect = map.getCanvasContainer().getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function GeoOverlayGizmo() {
  const { map, isLoaded } = useMap();
  const selectedId = useLayersStore((s) => s.selectedId);
  const layer = useLayersStore((s) =>
    s.layers.find((item) => item.id === selectedId),
  );
  const isPreview = useEditorStore((s) => s.isPreview);
  const [, setTick] = useState(0);
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    if (!map || !isLoaded) return;
    const onMove = () => setTick((value) => value + 1);
    map.on("move", onMove);
    return () => {
      map.off("move", onMove);
    };
  }, [map, isLoaded]);

  if (!map || !isLoaded || isPreview || !layer || !isGeoImageOverlay(layer)) {
    return null;
  }
  if (!layer.visible) return null;

  const overlay = layer as ImageOverlayLayer & { pose: typeof layer.pose };
  const quad = geoOverlayQuad(
    overlay.pose,
    overlay.naturalWidth,
    overlay.naturalHeight,
  );
  const points = quad.map(([lng, lat]) => map.project({ lng, lat }));
  const polygon = points.map((point) => `${point.x},${point.y}`).join(" ");
  const center = map.project({ lng: overlay.pose.lng, lat: overlay.pose.lat });
  const topMid = {
    x: (points[0].x + points[1].x) / 2,
    y: (points[0].y + points[1].y) / 2,
  };
  const dx = topMid.x - center.x;
  const dy = topMid.y - center.y;
  const len = Math.hypot(dx, dy) || 1;
  const rotateHandle = {
    x: topMid.x + (dx / len) * 28,
    y: topMid.y + (dy / len) * 28,
  };
  const locked = overlay.locked;

  const beginDrag = (event: React.PointerEvent, next: DragState) => {
    if (locked) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = next;
    event.currentTarget.setPointerCapture(event.pointerId);
    map.dragPan.disable();
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const point = pointerOnMap(map, event);
    if (drag.kind === "move") {
      const lngLat = map.unproject([point.x, point.y]);
      useLayersStore.getState().updateGeoPose(overlay.id, {
        lng: drag.poseLng + (lngLat.lng - drag.startLng),
        lat: drag.poseLat + (lngLat.lat - drag.startLat),
      });
      return;
    }
    if (drag.kind === "scale") {
      const dist = Math.hypot(point.x - center.x, point.y - center.y);
      const ratio = dist / Math.max(8, drag.startDist);
      useLayersStore.getState().updateGeoPose(overlay.id, {
        widthMeters: Math.max(10, drag.startWidth * ratio),
      });
      return;
    }
    const lngLat = map.unproject([point.x, point.y]);
    useLayersStore.getState().updateGeoPose(overlay.id, {
      bearing: geographicBearing(
        overlay.pose.lng,
        overlay.pose.lat,
        lngLat.lng,
        lngLat.lat,
      ),
    });
  };

  const endDrag = (event: React.PointerEvent) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
    map.dragPan.enable();
    syncActiveSceneLayers();
  };

  return (
    <div className="editor-overlay-gizmo">
      <svg>
        <polygon
          className={locked ? undefined : "editor-overlay-gizmo-hit"}
          points={polygon}
          fill="rgba(63,184,175,0.08)"
          stroke="rgba(63,184,175,0.95)"
          strokeWidth={2}
          onPointerDown={(event) => {
            const point = pointerOnMap(map, event);
            const lngLat = map.unproject([point.x, point.y]);
            beginDrag(event, {
              kind: "move",
              startLng: lngLat.lng,
              startLat: lngLat.lat,
              poseLng: overlay.pose.lng,
              poseLat: overlay.pose.lat,
            });
          }}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        />
        <line
          x1={topMid.x}
          y1={topMid.y}
          x2={rotateHandle.x}
          y2={rotateHandle.y}
          stroke="rgba(63,184,175,0.95)"
          strokeWidth={1.5}
        />
        {!locked
          ? points.map((point, index) => (
              <circle
                key={index}
                className="editor-overlay-gizmo-handle"
                cx={point.x}
                cy={point.y}
                r={6}
                fill="#0b1220"
                stroke="rgba(63,184,175,1)"
                strokeWidth={2}
                onPointerDown={(event) => {
                  const start = pointerOnMap(map, event);
                  beginDrag(event, {
                    kind: "scale",
                    startDist: Math.hypot(start.x - center.x, start.y - center.y),
                    startWidth: overlay.pose.widthMeters,
                  });
                }}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              />
            ))
          : null}
        {!locked ? (
          <circle
            className="editor-overlay-gizmo-rotate"
            cx={rotateHandle.x}
            cy={rotateHandle.y}
            r={7}
            fill="#3fb8af"
            stroke="#ecfeff"
            strokeWidth={2}
            onPointerDown={(event) => beginDrag(event, { kind: "rotate" })}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          />
        ) : null}
      </svg>
    </div>
  );
}
