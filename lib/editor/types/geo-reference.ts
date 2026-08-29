export type CoordVec3 = {
  x: number;
  y: number;
  z: number;
};

/** WGS84 geographic point. Altitude is meters; 0 when unknown. */
export type GeoPoint = {
  latitude: number;
  longitude: number;
  altitude: number;
};

/** Canonical local metric frame: +X east, +Y north, +Z up (meters). */
export type EnuPoint = CoordVec3;

export type AlignmentMethod = "2-point" | "3-point";

export type AlignmentControlPoint = {
  id: string;
  local: CoordVec3;
  geo: GeoPoint;
};

/** Derived affine cache. Control points remain the source of truth. */
export type SceneTransform = {
  /** Column-major 4x4, local scene → ENU meters. */
  matrix: number[];
  inverse: number[];
  translation: CoordVec3;
  rotationDeg: CoordVec3;
  scale: number;
};

export type GeoReferenceStatus = "aligned" | "invalid";

export type GeoReference = {
  geoSceneId: string;
  alignmentMethod: AlignmentMethod;
  origin: GeoPoint;
  controlPoints: AlignmentControlPoint[];
  transform: SceneTransform;
  status: GeoReferenceStatus;
  error?: string;
};

export function cloneCoordVec3(v: CoordVec3): CoordVec3 {
  return { x: v.x, y: v.y, z: v.z };
}

export function cloneGeoPoint(p: GeoPoint): GeoPoint {
  return {
    latitude: p.latitude,
    longitude: p.longitude,
    altitude: p.altitude,
  };
}

export function cloneSceneTransform(t: SceneTransform): SceneTransform {
  return {
    matrix: [...t.matrix],
    inverse: [...t.inverse],
    translation: cloneCoordVec3(t.translation),
    rotationDeg: cloneCoordVec3(t.rotationDeg),
    scale: t.scale,
  };
}

export function cloneAlignmentControlPoint(
  point: AlignmentControlPoint,
): AlignmentControlPoint {
  return {
    id: point.id,
    local: cloneCoordVec3(point.local),
    geo: cloneGeoPoint(point.geo),
  };
}

export function cloneGeoReference(
  ref: GeoReference | null | undefined,
): GeoReference | undefined {
  if (!ref) return undefined;
  return {
    geoSceneId: ref.geoSceneId,
    alignmentMethod: ref.alignmentMethod,
    origin: cloneGeoPoint(ref.origin),
    controlPoints: ref.controlPoints.map(cloneAlignmentControlPoint),
    transform: cloneSceneTransform(ref.transform),
    status: ref.status,
    error: ref.error,
  };
}

export function isAlignedGeoReference(
  ref: GeoReference | null | undefined,
): ref is GeoReference & { status: "aligned" } {
  return ref != null && ref.status === "aligned";
}

export function requiredControlPointCount(method: AlignmentMethod): number {
  return method === "3-point" ? 3 : 2;
}

export function alignmentMethodForSceneType(
  type: "model" | "image" | "geo",
): AlignmentMethod | null {
  if (type === "model") return "3-point";
  if (type === "image") return "2-point";
  return null;
}
