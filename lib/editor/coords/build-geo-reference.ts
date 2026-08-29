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
import { vec3Dist } from "@/lib/editor/coords/vec3";
import { validateControlPoints } from "@/lib/editor/coords/validate";

export type BuildGeoReferenceInput = {
  geoSceneId: string;
  alignmentMethod: AlignmentMethod;
  controlPoints: AlignmentControlPoint[];
};

export type BuildGeoReferenceResult =
  | { ok: true; geoReference: GeoReference; residualRms: number }
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
