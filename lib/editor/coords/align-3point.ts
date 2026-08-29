import type { CoordVec3, SceneTransform } from "@/lib/editor/types/geo-reference";
import {
  mat4FromLinearTranslation,
  sceneTransformFromMatrix,
} from "@/lib/editor/coords/mat4";
import {
  mat3Det,
  mat3Mul,
  mat3MulVec,
  mat3Transpose,
  svd3,
  type Mat3,
} from "@/lib/editor/coords/svd3";
import { vec3Centroid, vec3Len2, vec3Sub } from "@/lib/editor/coords/vec3";

const MIN_SCALE = 1e-8;

export type Align3PointResult =
  | { ok: true; transform: SceneTransform }
  | { ok: false; error: string };

/**
 * Umeyama/Kabsch similarity (uniform scale, rotation, translation) from 3+
 * corresponding points. Local PlayCanvas XYZ → canonical ENU meters.
 */
export function align3Point(
  local: readonly CoordVec3[],
  enu: readonly CoordVec3[],
): Align3PointResult {
  if (local.length < 3 || enu.length < 3 || local.length !== enu.length) {
    return { ok: false, error: "3-point alignment requires three corresponding points" };
  }

  const muX = vec3Centroid(local);
  const muY = vec3Centroid(enu);
  const X = local.map((p) => vec3Sub(p, muX));
  const Y = enu.map((p) => vec3Sub(p, muY));

  let varX = 0;
  const H: Mat3 = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < X.length; i++) {
    varX += vec3Len2(X[i]!);
    // H += Y * Xᵀ  (row r, col c)
    H[0] += Y[i]!.x * X[i]!.x;
    H[1] += Y[i]!.x * X[i]!.y;
    H[2] += Y[i]!.x * X[i]!.z;
    H[3] += Y[i]!.y * X[i]!.x;
    H[4] += Y[i]!.y * X[i]!.y;
    H[5] += Y[i]!.y * X[i]!.z;
    H[6] += Y[i]!.z * X[i]!.x;
    H[7] += Y[i]!.z * X[i]!.y;
    H[8] += Y[i]!.z * X[i]!.z;
  }
  if (varX < MIN_SCALE) {
    return { ok: false, error: "Local points do not span a 3D volume" };
  }

  const { U, S, V } = svd3(H);
  const Vt = mat3Transpose(V);
  let d = mat3Det(mat3Mul(U, Vt));
  if (!Number.isFinite(d)) d = 1;
  const Sdet: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, d < 0 ? -1 : 1];
  const R = mat3Mul(mat3Mul(U, Sdet), Vt);

  const scale = (S[0] + S[1] + (d < 0 ? -S[2] : S[2])) / varX;
  if (!Number.isFinite(scale) || Math.abs(scale) < MIN_SCALE) {
    return { ok: false, error: "Alignment scale is degenerate" };
  }

  const RmuX = mat3MulVec(R, muX);
  const translation = {
    x: muY.x - scale * RmuX.x,
    y: muY.y - scale * RmuX.y,
    z: muY.z - scale * RmuX.z,
  };

  const lin = [
    [scale * R[0], scale * R[1], scale * R[2]],
    [scale * R[3], scale * R[4], scale * R[5]],
    [scale * R[6], scale * R[7], scale * R[8]],
  ];
  const matrix = mat4FromLinearTranslation(lin, translation);
  const transform = sceneTransformFromMatrix(matrix);
  if (!transform) {
    return { ok: false, error: "Failed to build an invertible 3-point transform" };
  }
  return { ok: true, transform };
}
