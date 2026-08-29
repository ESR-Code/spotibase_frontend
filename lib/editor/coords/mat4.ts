import type { CoordVec3, SceneTransform } from "@/lib/editor/types/geo-reference";
import { vec3Len } from "@/lib/editor/coords/vec3";

/** Column-major 4×4 affine matrix. */
export type Mat4 = number[];

export function mat4Identity(): Mat4 {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

export function mat4Clone(m: Mat4): Mat4 {
  return m.slice();
}

/** Column-major 4×4 from rotation around Z (radians) + uniform scale + translation. */
export function mat4FromRzScaleTranslation(
  yawRad: number,
  scale: number,
  translation: CoordVec3,
): Mat4 {
  const c = Math.cos(yawRad);
  const s = Math.sin(yawRad);
  const sc = scale * c;
  const ss = scale * s;
  return [
    sc, ss, 0, 0,
    -ss, sc, 0, 0,
    0, 0, scale, 0,
    translation.x, translation.y, translation.z, 1,
  ];
}

/**
 * PlayCanvas Y-up ground (x, z) → ENU (east, north); local y → up.
 * `yawRad` rotates in the XZ plane: (x, z) ↦ (c x − s z, s x + c z).
 */
export function mat4FromYUpYawScaleTranslation(
  yawRad: number,
  scale: number,
  translation: CoordVec3,
): Mat4 {
  const c = Math.cos(yawRad);
  const s = Math.sin(yawRad);
  const sc = scale * c;
  const ss = scale * s;
  return [
    sc, ss, 0, 0,
    0, 0, scale, 0,
    -ss, sc, 0, 0,
    translation.x, translation.y, translation.z, 1,
  ];
}

/** Column-major 4×4 from 3×3 linear map (row-major lin[r][c]) + translation. */
export function mat4FromLinearTranslation(
  lin: number[][],
  translation: CoordVec3,
): Mat4 {
  return [
    lin[0][0], lin[1][0], lin[2][0], 0,
    lin[0][1], lin[1][1], lin[2][1], 0,
    lin[0][2], lin[1][2], lin[2][2], 0,
    translation.x, translation.y, translation.z, 1,
  ];
}

export function mat4TransformPoint(m: Mat4, p: CoordVec3): CoordVec3 {
  return {
    x: m[0] * p.x + m[4] * p.y + m[8] * p.z + m[12],
    y: m[1] * p.x + m[5] * p.y + m[9] * p.z + m[13],
    z: m[2] * p.x + m[6] * p.y + m[10] * p.z + m[14],
  };
}

export function mat4Invert(m: Mat4): Mat4 | null {
  const inv = new Array<number>(16);
  inv[0] =
    m[5] * m[10] * m[15] -
    m[5] * m[11] * m[14] -
    m[9] * m[6] * m[15] +
    m[9] * m[7] * m[14] +
    m[13] * m[6] * m[11] -
    m[13] * m[7] * m[10];
  inv[4] =
    -m[4] * m[10] * m[15] +
    m[4] * m[11] * m[14] +
    m[8] * m[6] * m[15] -
    m[8] * m[7] * m[14] -
    m[12] * m[6] * m[11] +
    m[12] * m[7] * m[10];
  inv[8] =
    m[4] * m[9] * m[15] -
    m[4] * m[11] * m[13] -
    m[8] * m[5] * m[15] +
    m[8] * m[7] * m[13] +
    m[12] * m[5] * m[11] -
    m[12] * m[7] * m[9];
  inv[12] =
    -m[4] * m[9] * m[14] +
    m[4] * m[10] * m[13] +
    m[8] * m[5] * m[14] -
    m[8] * m[6] * m[13] -
    m[12] * m[5] * m[10] +
    m[12] * m[6] * m[9];
  inv[1] =
    -m[1] * m[10] * m[15] +
    m[1] * m[11] * m[14] +
    m[9] * m[2] * m[15] -
    m[9] * m[3] * m[14] -
    m[13] * m[2] * m[11] +
    m[13] * m[3] * m[10];
  inv[5] =
    m[0] * m[10] * m[15] -
    m[0] * m[11] * m[14] -
    m[8] * m[2] * m[15] +
    m[8] * m[3] * m[14] +
    m[12] * m[2] * m[11] -
    m[12] * m[3] * m[10];
  inv[9] =
    -m[0] * m[9] * m[15] +
    m[0] * m[11] * m[13] +
    m[8] * m[1] * m[15] -
    m[8] * m[3] * m[13] -
    m[12] * m[1] * m[11] +
    m[12] * m[3] * m[9];
  inv[13] =
    m[0] * m[9] * m[14] -
    m[0] * m[10] * m[13] -
    m[8] * m[1] * m[14] +
    m[8] * m[2] * m[13] +
    m[12] * m[1] * m[10] -
    m[12] * m[2] * m[9];
  inv[2] =
    m[1] * m[6] * m[15] -
    m[1] * m[7] * m[14] -
    m[5] * m[2] * m[15] +
    m[5] * m[3] * m[14] +
    m[13] * m[2] * m[7] -
    m[13] * m[3] * m[6];
  inv[6] =
    -m[0] * m[6] * m[15] +
    m[0] * m[7] * m[14] +
    m[4] * m[2] * m[15] -
    m[4] * m[3] * m[14] -
    m[12] * m[2] * m[7] +
    m[12] * m[3] * m[6];
  inv[10] =
    m[0] * m[5] * m[15] -
    m[0] * m[7] * m[13] -
    m[4] * m[1] * m[15] +
    m[4] * m[3] * m[13] +
    m[12] * m[1] * m[7] -
    m[12] * m[3] * m[5];
  inv[14] =
    -m[0] * m[5] * m[14] +
    m[0] * m[6] * m[13] +
    m[4] * m[1] * m[14] -
    m[4] * m[2] * m[13] -
    m[12] * m[1] * m[6] +
    m[12] * m[2] * m[5];
  inv[3] =
    -m[1] * m[6] * m[11] +
    m[1] * m[7] * m[10] +
    m[5] * m[2] * m[11] -
    m[5] * m[3] * m[10] -
    m[9] * m[2] * m[7] +
    m[9] * m[3] * m[6];
  inv[7] =
    m[0] * m[6] * m[11] -
    m[0] * m[7] * m[10] -
    m[4] * m[2] * m[11] +
    m[4] * m[3] * m[10] +
    m[8] * m[2] * m[7] -
    m[8] * m[3] * m[6];
  inv[11] =
    -m[0] * m[5] * m[11] +
    m[0] * m[7] * m[9] +
    m[4] * m[1] * m[11] -
    m[4] * m[3] * m[9] -
    m[8] * m[1] * m[7] +
    m[8] * m[3] * m[5];
  inv[15] =
    m[0] * m[5] * m[10] -
    m[0] * m[6] * m[9] -
    m[4] * m[1] * m[10] +
    m[4] * m[2] * m[9] +
    m[8] * m[1] * m[6] -
    m[8] * m[2] * m[5];

  const det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];
  if (Math.abs(det) < 1e-12) return null;
  const invDet = 1 / det;
  for (let i = 0; i < 16; i++) inv[i] *= invDet;
  return inv;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** XYZ intrinsic Euler (degrees) from a uniform-scale affine. */
export function mat4Decompose(m: Mat4): {
  translation: CoordVec3;
  rotationDeg: CoordVec3;
  scale: number;
} {
  const col0 = { x: m[0], y: m[1], z: m[2] };
  const col1 = { x: m[4], y: m[5], z: m[6] };
  const col2 = { x: m[8], y: m[9], z: m[10] };
  const sx = vec3Len(col0);
  const sy = vec3Len(col1);
  const sz = vec3Len(col2);
  const scale = (sx + sy + sz) / 3 || 1;
  const r00 = col0.x / (sx || 1);
  const r10 = col0.y / (sx || 1);
  const r20 = col0.z / (sx || 1);
  const r11 = col1.y / (sy || 1);
  const r21 = col1.z / (sy || 1);
  const r12 = col2.y / (sz || 1);
  const r22 = col2.z / (sz || 1);

  const syEuler = Math.sqrt(r00 * r00 + r10 * r10);
  let x: number;
  let y: number;
  let z: number;
  if (syEuler > 1e-6) {
    x = Math.atan2(r21, r22);
    y = Math.atan2(-r20, syEuler);
    z = Math.atan2(r10, r00);
  } else {
    x = Math.atan2(-r12, r11);
    y = Math.atan2(-r20, syEuler);
    z = 0;
  }

  return {
    translation: { x: m[12], y: m[13], z: m[14] },
    rotationDeg: {
      x: (x * 180) / Math.PI,
      y: (y * 180) / Math.PI,
      z: (z * 180) / Math.PI,
    },
    scale,
  };
}

export function sceneTransformFromMatrix(matrix: Mat4): SceneTransform | null {
  const inverse = mat4Invert(matrix);
  if (!inverse) return null;
  const parts = mat4Decompose(matrix);
  if (!Number.isFinite(parts.scale) || Math.abs(parts.scale) < 1e-10) {
    return null;
  }
  return {
    matrix: mat4Clone(matrix),
    inverse,
    translation: parts.translation,
    rotationDeg: {
      x: clamp(parts.rotationDeg.x, -180, 180),
      y: clamp(parts.rotationDeg.y, -180, 180),
      z: clamp(parts.rotationDeg.z, -180, 180),
    },
    scale: parts.scale,
  };
}
