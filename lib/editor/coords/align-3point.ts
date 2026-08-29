import type { CoordVec3, SceneTransform } from "@/lib/editor/types/geo-reference";
import {
  mat4FromLinearTranslation,
  mat4FromYUpYawScaleTranslation,
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
 * PlayCanvas Y-up ground (x, z) → ENU (east, north) with local y → up.
 * Used when control points sit on the grid / factory floor (coplanar).
 */
export function alignPlanarYUp(
  local: readonly CoordVec3[],
  enu: readonly CoordVec3[],
): Align3PointResult {
  if (local.length < 2 || local.length !== enu.length) {
    return { ok: false, error: "Planar alignment needs at least two corresponding points" };
  }

  const muL = vec3Centroid(local);
  const muW = vec3Centroid(enu);
  let varXz = 0;
  let h00 = 0;
  let h01 = 0;
  let h10 = 0;
  let h11 = 0;
  for (let i = 0; i < local.length; i++) {
    const lx = local[i]!.x - muL.x;
    const lz = local[i]!.z - muL.z;
    const we = enu[i]!.x - muW.x;
    const wn = enu[i]!.y - muW.y;
    varXz += lx * lx + lz * lz;
    h00 += we * lx;
    h01 += we * lz;
    h10 += wn * lx;
    h11 += wn * lz;
  }
  if (varXz < MIN_SCALE) {
    return { ok: false, error: "Local points do not span the ground plane" };
  }

  const x = h00 + h11;
  const y = h10 - h01;
  const r = Math.hypot(x, y);
  const c = r < MIN_SCALE ? 1 : x / r;
  const s = r < MIN_SCALE ? 0 : y / r;
  const scale = r / varXz;
  if (!Number.isFinite(scale) || Math.abs(scale) < MIN_SCALE) {
    return { ok: false, error: "Alignment scale is degenerate" };
  }

  const yaw = Math.atan2(s, c);
  const rx = scale * (c * muL.x - s * muL.z);
  const ry = scale * (s * muL.x + c * muL.z);
  const translation = {
    x: muW.x - rx,
    y: muW.y - ry,
    z: muW.z - scale * muL.y,
  };
  const matrix = mat4FromYUpYawScaleTranslation(yaw, scale, translation);
  const transform = sceneTransformFromMatrix(matrix);
  if (!transform) {
    return { ok: false, error: "Failed to build an invertible 3-point transform" };
  }
  return { ok: true, transform };
}

function alignUmeyama(
  local: readonly CoordVec3[],
  enu: readonly CoordVec3[],
): Align3PointResult {
  const muX = vec3Centroid(local);
  const muY = vec3Centroid(enu);
  const X = local.map((p) => vec3Sub(p, muX));
  const Y = enu.map((p) => vec3Sub(p, muY));

  let varX = 0;
  const H: Mat3 = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < X.length; i++) {
    varX += vec3Len2(X[i]!);
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

/**
 * Umeyama/Kabsch similarity (uniform scale, rotation, translation) from 3+
 * corresponding points. Local PlayCanvas XYZ → canonical ENU meters.
 *
 * Ground-control picks on the grid or factory floor are coplanar (same height).
 * Full 3D Umeyama is rank-deficient in that case, so we fall back to a Y-up
 * planar similarity that stays invertible.
 */
export function align3Point(
  local: readonly CoordVec3[],
  enu: readonly CoordVec3[],
): Align3PointResult {
  if (local.length < 3 || enu.length < 3 || local.length !== enu.length) {
    return { ok: false, error: "3-point alignment requires three corresponding points" };
  }

  const umeyama = alignUmeyama(local, enu);
  if (umeyama.ok) return umeyama;
  return alignPlanarYUp(local, enu);
}
