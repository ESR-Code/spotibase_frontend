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
const METERS_PER_DEG_LAT = 111_320;

/** Bounding square used for gizmo handles (aspect 1:1). */
export function shapeOverlayBoundsQuad(pose: OverlayGeoPose): OverlayQuad {
  return geoOverlayQuad(pose, 1, 1);
}

export function shapeOverlayPolygon(
  pose: OverlayGeoPose,
  shape: ShapeOverlayKind,
  ring: [number, number][] | null = null,
): GeoJSON.Feature<GeoJSON.Polygon> {
  if (shape === "free" && ring && ring.length >= 3) {
    const closed = [...ring, ring[0]!];
    return {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [closed.map(([lng, lat]) => [lng, lat])],
      },
    };
  }

  if (shape === "square" || shape === "free") {
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

  let points: [number, number][];

  if (shape === "triangle") {
    points = [
      toLngLat(0, half),
      toLngLat(half, -half),
      toLngLat(-half, -half),
      toLngLat(0, half),
    ];
  } else {
    points = [];
    for (let i = 0; i <= CIRCLE_SEGMENTS; i++) {
      const a = (i / CIRCLE_SEGMENTS) * Math.PI * 2;
      points.push(toLngLat(Math.cos(a) * half, Math.sin(a) * half));
    }
  }

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [points],
    },
  };
}

export function ringCentroid(ring: [number, number][]): { lng: number; lat: number } {
  let lng = 0;
  let lat = 0;
  for (const [x, y] of ring) {
    lng += x;
    lat += y;
  }
  const n = Math.max(1, ring.length);
  return { lng: lng / n, lat: lat / n };
}

/** Approximate width in meters from ring extent (max axis-aligned span). */
export function ringWidthMeters(ring: [number, number][]): number {
  if (ring.length === 0) return 40;
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of ring) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  const midLat = (minLat + maxLat) / 2;
  const cosLat = Math.max(0.01, Math.abs(Math.cos((midLat * Math.PI) / 180)));
  const width =
    (maxLng - minLng) * METERS_PER_DEG_LAT * cosLat;
  const height = (maxLat - minLat) * METERS_PER_DEG_LAT;
  return Math.max(40, Math.max(width, height));
}

export function poseFromRing(ring: [number, number][]): OverlayGeoPose {
  const center = ringCentroid(ring);
  return {
    space: "geo",
    lng: center.lng,
    lat: center.lat,
    widthMeters: ringWidthMeters(ring),
    bearing: 0,
  };
}

export function translateRing(
  ring: [number, number][],
  dLng: number,
  dLat: number,
): [number, number][] {
  return ring.map(([lng, lat]) => [lng + dLng, lat + dLat]);
}

export function scaleRingAround(
  ring: [number, number][],
  originLng: number,
  originLat: number,
  scale: number,
): [number, number][] {
  return ring.map(([lng, lat]) => {
    const east =
      (lng - originLng) *
      METERS_PER_DEG_LAT *
      Math.max(0.01, Math.abs(Math.cos((originLat * Math.PI) / 180)));
    const north = (lat - originLat) * METERS_PER_DEG_LAT;
    return offsetLngLat(originLng, originLat, east * scale, north * scale);
  });
}

export function rotateRingAround(
  ring: [number, number][],
  originLng: number,
  originLat: number,
  deltaDeg: number,
): [number, number][] {
  const theta = (deltaDeg * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const cosLat = Math.max(0.01, Math.abs(Math.cos((originLat * Math.PI) / 180)));
  return ring.map(([lng, lat]) => {
    const east = (lng - originLng) * METERS_PER_DEG_LAT * cosLat;
    const north = (lat - originLat) * METERS_PER_DEG_LAT;
    const x = east * cos - north * sin;
    const y = east * sin + north * cos;
    return offsetLngLat(originLng, originLat, x, y);
  });
}

/** Bounds quad from freehand ring for the edit gizmo. */
export function freeRingBoundsQuad(ring: [number, number][]): OverlayQuad {
  const pose = poseFromRing(ring);
  return shapeOverlayBoundsQuad(pose);
}
