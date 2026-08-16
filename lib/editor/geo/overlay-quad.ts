import type { ImageOverlayGeoPose } from "@/lib/editor/types/scene-layer";

export type OverlayQuad = [
  [number, number],
  [number, number],
  [number, number],
  [number, number],
];

const METERS_PER_DEG_LAT = 111_320;

export function overlayHeightMeters(
  widthMeters: number,
  naturalWidth: number,
  naturalHeight: number,
): number {
  if (naturalWidth <= 0) return widthMeters;
  return widthMeters * (naturalHeight / naturalWidth);
}

export function offsetLngLat(
  lng: number,
  lat: number,
  eastMeters: number,
  northMeters: number,
): [number, number] {
  const dLat = northMeters / METERS_PER_DEG_LAT;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const dLng = eastMeters / (METERS_PER_DEG_LAT * Math.max(0.01, Math.abs(cosLat)));
  return [lng + dLng, Math.max(-85, Math.min(85, lat + dLat))];
}

/** Top-left, top-right, bottom-right, bottom-left — MapLibre image source order. */
export function geoOverlayQuad(
  pose: ImageOverlayGeoPose,
  naturalWidth: number,
  naturalHeight: number,
): OverlayQuad {
  const height = overlayHeightMeters(
    pose.widthMeters,
    naturalWidth,
    naturalHeight,
  );
  const halfW = pose.widthMeters / 2;
  const halfH = height / 2;
  const theta = (pose.bearing * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const local: [number, number][] = [
    [-halfW, halfH],
    [halfW, halfH],
    [halfW, -halfH],
    [-halfW, -halfH],
  ];
  return local.map(([x, y]) => {
    const east = x * cos + y * sin;
    const north = -x * sin + y * cos;
    return offsetLngLat(pose.lng, pose.lat, east, north);
  }) as OverlayQuad;
}

export function overlayQuadPolygon(quad: OverlayQuad): GeoJSON.Feature<GeoJSON.Polygon> {
  const ring = [...quad, quad[0]];
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [ring.map(([lng, lat]) => [lng, lat])],
    },
  };
}

export function defaultOverlayWidthMeters(
  lat: number,
  zoom: number,
  viewportWidthPx: number,
): number {
  const metersPerPixel =
    (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;
  const width = metersPerPixel * Math.max(320, viewportWidthPx) * 0.25;
  return Math.max(40, width);
}

export function geographicBearing(
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number,
): number {
  const φ1 = (fromLat * Math.PI) / 180;
  const φ2 = (toLat * Math.PI) / 180;
  const Δλ = ((toLng - fromLng) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return ((θ * 180) / Math.PI + 360) % 360;
}
