import type { EnuPoint, GeoPoint } from "@/lib/editor/types/geo-reference";

const DEG = Math.PI / 180;

/** WGS84-ish meters per degree of latitude at φ (radians). */
export function metersPerDegLat(latRad: number): number {
  return (
    111_132.92 -
    559.82 * Math.cos(2 * latRad) +
    1.175 * Math.cos(4 * latRad) -
    0.0023 * Math.cos(6 * latRad)
  );
}

/** WGS84-ish meters per degree of longitude at φ (radians). */
export function metersPerDegLon(latRad: number): number {
  return (
    111_412.84 * Math.cos(latRad) -
    93.5 * Math.cos(3 * latRad) +
    0.118 * Math.cos(5 * latRad)
  );
}

export function wrapDeltaLng(deltaLng: number): number {
  let d = deltaLng;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

export function normalizeGeoPoint(geo: {
  latitude: number;
  longitude: number;
  altitude?: number;
}): GeoPoint {
  return {
    latitude: geo.latitude,
    longitude: geo.longitude,
    altitude: geo.altitude ?? 0,
  };
}

/**
 * Geographic → canonical ENU meters at `origin`.
 * +X east, +Y north, +Z up. Does not use Web Mercator.
 */
export function geoToWorld(geo: GeoPoint, origin: GeoPoint): EnuPoint {
  const lat0 = origin.latitude * DEG;
  const dLat = geo.latitude - origin.latitude;
  const dLng = wrapDeltaLng(geo.longitude - origin.longitude);
  return {
    x: dLng * metersPerDegLon(lat0),
    y: dLat * metersPerDegLat(lat0),
    z: (geo.altitude ?? 0) - (origin.altitude ?? 0),
  };
}

/** Canonical ENU meters → geographic at `origin`. */
export function worldToGeo(enu: EnuPoint, origin: GeoPoint): GeoPoint {
  const lat0 = origin.latitude * DEG;
  const mLat = metersPerDegLat(lat0);
  const mLon = Math.max(1e-9, Math.abs(metersPerDegLon(lat0)));
  const signLon = metersPerDegLon(lat0) < 0 ? -1 : 1;
  return {
    latitude: origin.latitude + enu.y / mLat,
    longitude: origin.longitude + (enu.x / mLon) * signLon,
    altitude: (origin.altitude ?? 0) + enu.z,
  };
}
