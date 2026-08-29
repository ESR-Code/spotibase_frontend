import type { CoordVec3 } from "@/lib/editor/types/geo-reference";

export function vec3(x: number, y: number, z: number): CoordVec3 {
  return { x, y, z };
}

export function vec3Clone(v: CoordVec3): CoordVec3 {
  return { x: v.x, y: v.y, z: v.z };
}

export function vec3Add(a: CoordVec3, b: CoordVec3): CoordVec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function vec3Sub(a: CoordVec3, b: CoordVec3): CoordVec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function vec3Scale(v: CoordVec3, s: number): CoordVec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function vec3Dot(a: CoordVec3, b: CoordVec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function vec3Cross(a: CoordVec3, b: CoordVec3): CoordVec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function vec3Len2(v: CoordVec3): number {
  return vec3Dot(v, v);
}

export function vec3Len(v: CoordVec3): number {
  return Math.sqrt(vec3Len2(v));
}

export function vec3Dist(a: CoordVec3, b: CoordVec3): number {
  return vec3Len(vec3Sub(a, b));
}

export function vec3Normalize(v: CoordVec3): CoordVec3 | null {
  const len = vec3Len(v);
  if (len < 1e-15) return null;
  return vec3Scale(v, 1 / len);
}

export function vec3Centroid(points: readonly CoordVec3[]): CoordVec3 {
  const n = points.length || 1;
  let x = 0;
  let y = 0;
  let z = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
    z += p.z;
  }
  return { x: x / n, y: y / n, z: z / n };
}
