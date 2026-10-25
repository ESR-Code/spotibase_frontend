import type {
  AlignmentControlPoint,
  AlignmentMethod,
  GeoReference,
  SceneTransform,
} from "@/lib/editor/types/geo-reference";
import { align2Point } from "@/lib/editor/coords/align-2point";
import { align3Point } from "@/lib/editor/coords/align-3point";
import { geoToWorld } from "@/lib/editor/coords/enu";
import { mat4TransformPoint } from "@/lib/editor/coords/mat4";
import { vec3Cross, vec3Dist, vec3Len, vec3Sub } from "@/lib/editor/coords/vec3";
import { validateControlPoints } from "@/lib/editor/coords/validate";

export type BuildGeoReferenceInput = {
  geoSceneId: string;
  alignmentMethod: AlignmentMethod;
  controlPoints: AlignmentControlPoint[];
};

export type BuildGeoReferenceResult =
  | {
      ok: true;
      geoReference: GeoReference;
      residualRms: number;
      /** Fit-quality concerns. The fit is valid; the author should confirm it. */
      warnings: string[];
    }
  | { ok: false; error: string };

export function residualRms(
  points: readonly AlignmentControlPoint[],
  origin: GeoReference["origin"],
  transform: SceneTransform,
): number {
  if (points.length === 0) return 0;
  let sum = 0;
  for (const p of points) {
    const predicted = mat4TransformPoint(transform.matrix, p.local);
    const actual = geoToWorld(p.geo, origin);
    const d = vec3Dist(predicted, actual);
    sum += d * d;
  }
  return Math.sqrt(sum / points.length);
}

/** Residual above this share of the span between the map points is suspicious. */
const RESIDUAL_WARN_RATIO = 0.05;
/** sin(angle) between the first two map-point directions below this is "nearly straight". */
const NEAR_COLLINEAR_SIN = 0.05;

function fitWarnings(
  method: AlignmentMethod,
  enu: readonly { x: number; y: number; z: number }[],
  rms: number,
): string[] {
  const warnings: string[] = [];
  let span = 0;
  for (let i = 0; i < enu.length; i++) {
    for (let j = i + 1; j < enu.length; j++) {
      span = Math.max(span, vec3Dist(enu[i]!, enu[j]!));
    }
  }
  if (span > 0 && rms / span > RESIDUAL_WARN_RATIO) {
    warnings.push(
      `The points do not fit well (RMS ${rms.toFixed(2)} m over ${span.toFixed(1)} m). Placements will be off.`,
    );
  }
  if (method === "3-point" && enu.length === 3) {
    const ab = vec3Sub(enu[1]!, enu[0]!);
    const ac = vec3Sub(enu[2]!, enu[0]!);
    const lenAb = vec3Len(ab);
    const lenAc = vec3Len(ac);
    if (lenAb > 0 && lenAc > 0) {
      const sin = vec3Len(vec3Cross(ab, ac)) / (lenAb * lenAc);
      if (sin < NEAR_COLLINEAR_SIN) {
        warnings.push(
          "The three map points are almost in a straight line. Rotation and scale are poorly constrained; pick points that form a triangle.",
        );
      }
    }
  }
  return warnings;
}

export function buildGeoReference(
  input: BuildGeoReferenceInput,
): BuildGeoReferenceResult {
  const check = validateControlPoints(input.alignmentMethod, input.controlPoints);
  if (!check.ok) return check;

  const origin = { ...input.controlPoints[0]!.geo };
  const locals = input.controlPoints.map((p) => p.local);
  const enu = input.controlPoints.map((p) => geoToWorld(p.geo, origin));

  const aligned =
    input.alignmentMethod === "2-point"
      ? align2Point([locals[0]!, locals[1]!], [enu[0]!, enu[1]!])
      : align3Point(locals, enu);

  if (!aligned.ok) return aligned;

  const rms = residualRms(input.controlPoints, origin, aligned.transform);

  return {
    ok: true,
    residualRms: rms,
    warnings: fitWarnings(input.alignmentMethod, enu, rms),
    geoReference: {
      geoSceneId: input.geoSceneId,
      alignmentMethod: input.alignmentMethod,
      origin,
      controlPoints: input.controlPoints.map((p) => ({
        id: p.id,
        local: { ...p.local },
        geo: { ...p.geo },
      })),
      transform: aligned.transform,
      status: "aligned",
    },
  };
}
