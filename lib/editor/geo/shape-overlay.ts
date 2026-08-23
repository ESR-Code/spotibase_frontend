import {
  geoOverlayQuad,
  offsetLngLat,
  overlayQuadPolygon,
  type OverlayQuad,
} from "@/lib/editor/geo/overlay-quad";
import type {
  OverlayGeoPose,
  ShapeOverlayKind,
} from "@/lib/editor/types/scene-layer";

const CIRCLE_SEGMENTS = 48;

/** Bounding square used for gizmo handles (aspect 1:1). */
export function shapeOverlayBoundsQuad(pose: OverlayGeoPose): OverlayQuad {
  return geoOverlayQuad(pose, 1, 1);
}

export function shapeOverlayPolygon(
  pose: OverlayGeoPose,
  shape: ShapeOverlayKind,
): GeoJSON.Feature<GeoJSON.Polygon> {
  if (shape === "square") {
    return overlayQuadPolygon(shapeOverlayBoundsQuad(pose));
  }

  const half = pose.widthMeters / 2;
  const theta = (pose.bearing * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);

  const toLngLat = (x: number, y: number): [number, number] => {
    const east = x * cos + y * sin;
    const north = -x * sin + y * cos;
    return offsetLngLat(pose.lng, pose.lat, east, north);
  };

  let ring: [number, number][];

  if (shape === "triangle") {
    // Point-up isosceles triangle inscribed in the bounding square.
    ring = [
      toLngLat(0, half),
      toLngLat(half, -half),
      toLngLat(-half, -half),
      toLngLat(0, half),
    ];
  } else {
    ring = [];
    for (let i = 0; i <= CIRCLE_SEGMENTS; i++) {
      const a = (i / CIRCLE_SEGMENTS) * Math.PI * 2;
      ring.push(toLngLat(Math.cos(a) * half, Math.sin(a) * half));
    }
  }

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [ring],
    },
  };
}
