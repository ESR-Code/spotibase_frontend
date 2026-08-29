import type {
  AlignmentControlPoint,
  AlignmentMethod,
  CoordVec3,
} from "@/lib/editor/types/geo-reference";
import { requiredControlPointCount } from "@/lib/editor/types/geo-reference";
import { geoToWorld } from "@/lib/editor/coords/enu";
import { vec3Cross, vec3Dist, vec3Len, vec3Sub } from "@/lib/editor/coords/vec3";

export const LOCAL_DUPLICATE_EPS = 1e-6;
/** Ignore map clicks closer than this in ENU meters. */
export const GEO_DUPLICATE_EPS_M = 0.05;
/** sin(angle) below this counts as collinear in local scene units. */
export const COLLINEAR_EPS = 1e-6;

export type AlignmentValidation =
  | { ok: true }
  | { ok: false; error: string };

export function validateControlPoints(
  method: AlignmentMethod,
  points: readonly AlignmentControlPoint[],
): AlignmentValidation {
  const needed = requiredControlPointCount(method);
  if (points.length !== needed) {
    return {
      ok: false,
      error: `${method} alignment requires ${needed} control points`,
    };
  }

  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    if (
      !Number.isFinite(a.local.x) ||
      !Number.isFinite(a.local.y) ||
      !Number.isFinite(a.local.z) ||
      !Number.isFinite(a.geo.latitude) ||
      !Number.isFinite(a.geo.longitude) ||
      !Number.isFinite(a.geo.altitude)
    ) {
      return { ok: false, error: `Control point ${i + 1} has invalid coordinates` };
    }
    if (Math.abs(a.geo.latitude) > 90) {
      return { ok: false, error: `Control point ${i + 1} latitude is out of range` };
    }
  }

  const origin = points[0]!.geo;
  const enu = points.map((p) => geoToWorld(p.geo, origin));

  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      if (vec3Dist(points[i]!.local, points[j]!.local) < LOCAL_DUPLICATE_EPS) {
        return {
          ok: false,
          error: `Local points ${i + 1} and ${j + 1} are duplicates`,
        };
      }
      if (vec3Dist(enu[i]!, enu[j]!) < GEO_DUPLICATE_EPS_M) {
        return {
          ok: false,
          error: `Geographic points ${i + 1} and ${j + 1} are too close together`,
        };
      }
    }
  }

  if (method === "3-point") {
    if (
      areCollinear(points[0]!.local, points[1]!.local, points[2]!.local)
    ) {
      return { ok: false, error: "Local points are collinear" };
    }
    // Do not reject nearly-collinear map points. Ground-control clicks along a
    // street are valid; Umeyama still solves using the local 3D triangle.
  }

  return { ok: true };
}

function areCollinear(a: CoordVec3, b: CoordVec3, c: CoordVec3): boolean {
  const ab = vec3Sub(b, a);
  const ac = vec3Sub(c, a);
  const abLen = vec3Len(ab);
  const acLen = vec3Len(ac);
  if (abLen < LOCAL_DUPLICATE_EPS || acLen < LOCAL_DUPLICATE_EPS) return true;
  const cr = vec3Cross(ab, ac);
  return vec3Len(cr) / (abLen * acLen) < COLLINEAR_EPS;
}
