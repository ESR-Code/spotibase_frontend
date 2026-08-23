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
  shapeOverlayBoundsQuad,
  shapeOverlayPolygon,
} from "@/lib/editor/geo/shape-overlay";
import {
  overlayContentKey,
  overlaySourceImage,
} from "@/lib/editor/layers/blend-overlay-image";
import {
  overlayHitLayerId,
  overlayHitSourceId,
  overlayRasterLayerId,
  overlayRasterSourceId,
  shapeFillLayerId,
  shapeLineLayerId,
  shapeSourceId,
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
  isGeoOverlay,
  isGeoShapeOverlay,
  type ShapeOverlayLayer,
} from "@/lib/editor/types/scene-layer";

function removeImageOverlay(map: MapLibreMap, layerId: string) {
  const rasterId = overlayRasterLayerId(layerId);
  const hitId = overlayHitLayerId(layerId);
  const rasterSrc = overlayRasterSourceId(layerId);
  const hitSrc = overlayHitSourceId(layerId);
  if (map.getLayer(hitId)) map.removeLayer(hitId);
  if (map.getLayer(rasterId)) map.removeLayer(rasterId);
  if (map.getSource(hitSrc)) map.removeSource(hitSrc);
  if (map.getSource(rasterSrc)) map.removeSource(rasterSrc);
}

function removeShapeOverlay(map: MapLibreMap, layerId: string) {
  const fillId = shapeFillLayerId(layerId);
  const lineId = shapeLineLayerId(layerId);
  const hitId = overlayHitLayerId(layerId);
  const shapeSrc = shapeSourceId(layerId);
  const hitSrc = overlayHitSourceId(layerId);
  if (map.getLayer(hitId)) map.removeLayer(hitId);
  if (map.getLayer(lineId)) map.removeLayer(lineId);
  if (map.getLayer(fillId)) map.removeLayer(fillId);
  if (map.getSource(hitSrc)) map.removeSource(hitSrc);
  if (map.getSource(shapeSrc)) map.removeSource(shapeSrc);
}

function visibleGeoLayers(
  layers: ReturnType<typeof useLayersStore.getState>["layers"],
) {
  return layers
    .filter(isGeoOverlay)
    .filter((layer) =>
      isPreviewLayerVisible(
        useEditorStore.getState().isPreview,
        layer.id,
        layer.visible,
      ),
    );
}

function syncShapeLayer(map: MapLibreMap, layer: ShapeOverlayLayer) {
  const shapeSrc = shapeSourceId(layer.id);
  const fillId = shapeFillLayerId(layer.id);
  const lineId = shapeLineLayerId(layer.id);
  const hitSrc = overlayHitSourceId(layer.id);
  const hitId = overlayHitLayerId(layer.id);
  const polygon = shapeOverlayPolygon(layer.pose, layer.shape);
  const fillOpacity = layer.opacity * 0.55;
  const lineOpacity = layer.opacity;

  const source = map.getSource(shapeSrc) as GeoJSONSource | undefined;
  if (source) {
    source.setData(polygon);
    if (map.getLayer(fillId)) {
      map.setPaintProperty(fillId, "fill-color", layer.fillColor);
      map.setPaintProperty(fillId, "fill-opacity", fillOpacity);
    }
    if (map.getLayer(lineId)) {
      map.setPaintProperty(lineId, "line-color", layer.strokeColor);
      map.setPaintProperty(lineId, "line-width", layer.strokeWidth);
      map.setPaintProperty(lineId, "line-opacity", lineOpacity);
    }
    (map.getSource(hitSrc) as GeoJSONSource | undefined)?.setData(polygon);
    return;
  }

  map.addSource(shapeSrc, { type: "geojson", data: polygon });
  map.addLayer({
    id: fillId,
    type: "fill",
    source: shapeSrc,
    paint: {
      "fill-color": layer.fillColor,
      "fill-opacity": fillOpacity,
    },
  });
  map.addLayer({
    id: lineId,
    type: "line",
    source: shapeSrc,
    paint: {
      "line-color": layer.strokeColor,
      "line-width": layer.strokeWidth,
      "line-opacity": lineOpacity,
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
      const wanted = visibleGeoLayers(layers);
      const wantedIds = new Set(wanted.map((layer) => layer.id));
      const style = map.getStyle();
      if (!style) return;

      const existingImage = Object.keys(style.sources ?? {}).filter((id) =>
        id.startsWith("editor-overlay-src-"),
      );
      for (const sourceId of existingImage) {
        const layerId = sourceId.slice("editor-overlay-src-".length);
        if (!wantedIds.has(layerId)) {
          removeImageOverlay(map, layerId);
          contentKeysRef.current.delete(layerId);
        }
      }

      const existingShape = Object.keys(style.sources ?? {}).filter((id) =>
        id.startsWith("editor-shape-src-"),
      );
      for (const sourceId of existingShape) {
        const layerId = sourceId.slice("editor-shape-src-".length);
        if (!wantedIds.has(layerId)) {
          removeShapeOverlay(map, layerId);
        }
      }

      for (const layer of wanted) {
        if (isGeoShapeOverlay(layer)) {
          // Drop any leftover image sources if kind changed (shouldn't happen).
          if (map.getSource(overlayRasterSourceId(layer.id))) {
            removeImageOverlay(map, layer.id);
          }
          syncShapeLayer(map, layer);
          continue;
        }

        if (!isGeoImageOverlay(layer)) continue;
        if (map.getSource(shapeSourceId(layer.id))) {
          removeShapeOverlay(map, layer.id);
        }

        const rasterSrc = overlayRasterSourceId(layer.id);
        const rasterId = overlayRasterLayerId(layer.id);
        const hitSrc = overlayHitSourceId(layer.id);
        const hitId = overlayHitLayerId(layer.id);
        const quad = geoOverlayQuad(
          layer.pose,
          layer.naturalWidth,
          layer.naturalHeight,
        );
        const hitPolygon = overlayQuadPolygon(quad);
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
          (map.getSource(hitSrc) as GeoJSONSource | undefined)?.setData(
            hitPolygon,
          );
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
          (map.getSource(hitSrc) as GeoJSONSource | undefined)?.setData(
            hitPolygon,
          );
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
          map.addSource(hitSrc, { type: "geojson", data: hitPolygon });
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

      // Preserve authored stack order (later layers draw above earlier ones).
      for (const layer of wanted) {
        if (isGeoImageOverlay(layer)) {
          const rasterId = overlayRasterLayerId(layer.id);
          if (map.getLayer(rasterId)) map.moveLayer(rasterId);
        } else {
          const fillId = shapeFillLayerId(layer.id);
          const lineId = shapeLineLayerId(layer.id);
          if (map.getLayer(fillId)) map.moveLayer(fillId);
          if (map.getLayer(lineId)) map.moveLayer(lineId);
        }
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
          removeImageOverlay(map, sourceId.slice("editor-overlay-src-".length));
        }
        if (sourceId.startsWith("editor-shape-src-")) {
          removeShapeOverlay(map, sourceId.slice("editor-shape-src-".length));
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

  if (!map || !isLoaded || isPreview || !layer || !isGeoOverlay(layer)) {
    return null;
  }
  if (!layer.visible) return null;

  const pose = layer.pose;
  const quad =
    layer.kind === "image-overlay"
      ? geoOverlayQuad(pose, layer.naturalWidth, layer.naturalHeight)
      : shapeOverlayBoundsQuad(pose);
  const points = quad.map(([lng, lat]) => map.project({ lng, lat }));
  const polygon = points.map((point) => `${point.x},${point.y}`).join(" ");
  const center = map.project({ lng: pose.lng, lat: pose.lat });
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
  const locked = layer.locked;
  const layerId = layer.id;

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
      useLayersStore.getState().updateGeoPose(layerId, {
        lng: drag.poseLng + (lngLat.lng - drag.startLng),
        lat: drag.poseLat + (lngLat.lat - drag.startLat),
      });
      return;
    }
    if (drag.kind === "scale") {
      const dist = Math.hypot(point.x - center.x, point.y - center.y);
      const ratio = dist / Math.max(8, drag.startDist);
      useLayersStore.getState().updateGeoPose(layerId, {
        widthMeters: Math.max(10, drag.startWidth * ratio),
      });
      return;
    }
    const lngLat = map.unproject([point.x, point.y]);
    useLayersStore.getState().updateGeoPose(layerId, {
      bearing: geographicBearing(pose.lng, pose.lat, lngLat.lng, lngLat.lat),
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
              poseLng: pose.lng,
              poseLat: pose.lat,
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
                    startWidth: pose.widthMeters,
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
