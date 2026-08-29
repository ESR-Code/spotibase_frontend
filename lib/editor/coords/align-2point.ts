import type { CoordVec3, SceneTransform } from "@/lib/editor/types/geo-reference";
import {
  mat4FromRzScaleTranslation,
  sceneTransformFromMatrix,
} from "@/lib/editor/coords/mat4";

const MIN_BASELINE = 1e-8;

export type Align2PointResult =
  | { ok: true; transform: SceneTransform }
  | { ok: false; error: string };

/**
 * Planar similarity (translation, yaw around ENU up, uniform scale).
 * Local (x, y) maps to ENU (east, north). Local z is forced to 0 when fitting;
 * the resulting matrix maps z → up with the same scale so it stays invertible.
 */
export function align2Point(
  local: readonly [CoordVec3, CoordVec3],
  enu: readonly [CoordVec3, CoordVec3],
): Align2PointResult {
  const l0 = { x: local[0].x, y: local[0].y, z: 0 };
  const l1 = { x: local[1].x, y: local[1].y, z: 0 };
  const w0 = { x: enu[0].x, y: enu[0].y, z: 0 };
  const w1 = { x: enu[1].x, y: enu[1].y, z: 0 };

  const lx = l1.x - l0.x;
  const ly = l1.y - l0.y;
  const wx = w1.x - w0.x;
  const wy = w1.y - w0.y;
  const lLen = Math.hypot(lx, ly);
  const wLen = Math.hypot(wx, wy);
  if (lLen < MIN_BASELINE) {
    return { ok: false, error: "Local points are too close together" };
  }
  if (wLen < MIN_BASELINE) {
    return { ok: false, error: "Geographic points are too close together" };
  }

  const scale = wLen / lLen;
  if (!Number.isFinite(scale) || scale < MIN_BASELINE) {
    return { ok: false, error: "Alignment scale is degenerate" };
  }

  const yaw = Math.atan2(wy, wx) - Math.atan2(ly, lx);
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const rx = scale * (c * l0.x - s * l0.y);
  const ry = scale * (s * l0.x + c * l0.y);
  const translation = {
    x: w0.x - rx,
    y: w0.y - ry,
    z: 0,
  };

  const matrix = mat4FromRzScaleTranslation(yaw, scale, translation);
  const transform = sceneTransformFromMatrix(matrix);
  if (!transform) {
    return { ok: false, error: "Failed to build an invertible 2-point transform" };
  }
  return { ok: true, transform };
}
