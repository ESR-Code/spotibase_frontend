import type { Entity, MeshInstance } from "playcanvas";
import {
  getMeshLocalGeometry,
  type LocalGeometry,
} from "@/lib/editor/engine/mesh-geometry";

/**
 * Topmost-surface queries against the 3D subject, used by Spawn Hotspot to
 * place lat/lon pins on roofs instead of inside the model.
 *
 * A downward ray at (x, z) hits the highest triangle above that point, so we
 * project triangles to the XZ plane and interpolate Y with barycentrics. Each
 * mesh instance keeps a world-space copy of its vertices plus a uniform XZ
 * grid, built lazily the first time a query lands inside its bounds and
 * rebuilt only when its world matrix changes. A query is then one cell
 * lookup per overlapping mesh instead of a scan over every triangle.
 *
 * The engine is reached through a binding (same pattern as
 * `model-animation.ts`) so action code never imports PlayCanvas instances.
 */

export type SubjectSurfaceBinding = {
  /** Renderable subject entities (model scenes only). */
  getMeshEntities: () => readonly Entity[];
  /** `pc.PRIMITIVE_TRIANGLES`, passed in so this file stays engine-free. */
  triangleType: number;
};

type WorldEntry = {
  matrix: Float32Array;
  positions: Float32Array;
  triangles: Uint32Array;
  minX: number;
  minZ: number;
  invCellX: number;
  invCellZ: number;
  nx: number;
  nz: number;
  cellStart: Uint32Array;
  cellTriangles: Uint32Array;
};

const MAX_GRID_AXIS = 256;
/** Barycentric slack so pins on shared edges do not fall through cracks. */
const BARY_EPS = 1e-6;

let bound: SubjectSurfaceBinding | null = null;
let worldCache = new WeakMap<MeshInstance, WorldEntry | null>();

export function bindSubjectSurface(binding: SubjectSurfaceBinding): void {
  bound = binding;
  worldCache = new WeakMap();
}

export function unbindSubjectSurface(): void {
  bound = null;
  worldCache = new WeakMap();
}

/** True when a model subject is bound (a query can return a hit). */
export function hasSubjectSurface(): boolean {
  return bound != null;
}

function visibleMeshInstances(): MeshInstance[] {
  if (!bound) return [];
  const out: MeshInstance[] = [];
  for (const entity of bound.getMeshEntities()) {
    const render = entity.render;
    if (!entity.enabled || !render?.enabled || !render.meshInstances?.length) {
      continue;
    }
    for (const mi of render.meshInstances) {
      if (mi.visible === false) continue;
      out.push(mi);
    }
  }
  return out;
}

function sameMatrix(a: Float32Array, b: ArrayLike<number>): boolean {
  for (let i = 0; i < 16; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function buildWorldEntry(
  local: LocalGeometry,
  matrix: ArrayLike<number>,
): WorldEntry | null {
  const vertexCount = local.positions.length / 3;
  const positions = new Float32Array(local.positions.length);
  const m = matrix;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let v = 0; v < vertexCount; v++) {
    const x = local.positions[v * 3];
    const y = local.positions[v * 3 + 1];
    const z = local.positions[v * 3 + 2];
    const wx = m[0] * x + m[4] * y + m[8] * z + m[12];
    const wy = m[1] * x + m[5] * y + m[9] * z + m[13];
    const wz = m[2] * x + m[6] * y + m[10] * z + m[14];
    positions[v * 3] = wx;
    positions[v * 3 + 1] = wy;
    positions[v * 3 + 2] = wz;
    if (wx < minX) minX = wx;
    if (wx > maxX) maxX = wx;
    if (wz < minZ) minZ = wz;
    if (wz > maxZ) maxZ = wz;
  }
  if (!Number.isFinite(minX + maxX + minZ + maxZ)) return null;

  const triCount = local.triangles.length / 3;
  const axis = Math.min(
    MAX_GRID_AXIS,
    Math.max(1, Math.ceil(Math.sqrt(triCount))),
  );
  const nx = axis;
  const nz = axis;
  const width = Math.max(maxX - minX, 1e-6);
  const depth = Math.max(maxZ - minZ, 1e-6);
  const invCellX = nx / width;
  const invCellZ = nz / depth;

  const cellIndex = (value: number, min: number, inv: number, n: number) =>
    Math.min(n - 1, Math.max(0, Math.floor((value - min) * inv)));

  const counts = new Uint32Array(nx * nz + 1);
  const ranges = new Int32Array(triCount * 4);

  // Pass 1: cell range per triangle and per-cell counts.
  for (let t = 0; t < triCount; t++) {
    const a = local.triangles[t * 3] * 3;
    const b = local.triangles[t * 3 + 1] * 3;
    const c = local.triangles[t * 3 + 2] * 3;
    const x0 = Math.min(positions[a], positions[b], positions[c]);
    const x1 = Math.max(positions[a], positions[b], positions[c]);
    const z0 = Math.min(positions[a + 2], positions[b + 2], positions[c + 2]);
    const z1 = Math.max(positions[a + 2], positions[b + 2], positions[c + 2]);
    if (!Number.isFinite(x0 + x1 + z0 + z1)) {
      ranges[t * 4] = 1;
      ranges[t * 4 + 2] = 0; // empty range
      continue;
    }
    const ix0 = cellIndex(x0, minX, invCellX, nx);
    const ix1 = cellIndex(x1, minX, invCellX, nx);
    const iz0 = cellIndex(z0, minZ, invCellZ, nz);
    const iz1 = cellIndex(z1, minZ, invCellZ, nz);
    ranges[t * 4] = ix0;
    ranges[t * 4 + 1] = ix1;
    ranges[t * 4 + 2] = iz0;
    ranges[t * 4 + 3] = iz1;
    for (let iz = iz0; iz <= iz1; iz++) {
      for (let ix = ix0; ix <= ix1; ix++) {
        counts[iz * nx + ix + 1]++;
      }
    }
  }

  const cellStart = new Uint32Array(nx * nz + 1);
  for (let i = 0; i < nx * nz; i++) {
    cellStart[i + 1] = cellStart[i] + counts[i + 1];
  }
  const cellTriangles = new Uint32Array(cellStart[nx * nz]);
  const fill = cellStart.slice(0, nx * nz);

  // Pass 2: bucket triangle ids.
  for (let t = 0; t < triCount; t++) {
    const ix0 = ranges[t * 4];
    const ix1 = ranges[t * 4 + 1];
    const iz0 = ranges[t * 4 + 2];
    const iz1 = ranges[t * 4 + 3];
    for (let iz = iz0; iz <= iz1; iz++) {
      for (let ix = ix0; ix <= ix1; ix++) {
        cellTriangles[fill[iz * nx + ix]++] = t;
      }
    }
  }

  return {
    matrix: Float32Array.from(matrix),
    positions,
    triangles: local.triangles,
    minX,
    minZ,
    invCellX,
    invCellZ,
    nx,
    nz,
    cellStart,
    cellTriangles,
  };
}

function entryFor(
  mi: MeshInstance,
  triangleType: number,
): WorldEntry | null {
  const matrix = mi.node.getWorldTransform().data;
  const cached = worldCache.get(mi);
  if (cached && sameMatrix(cached.matrix, matrix)) return cached;

  const local = getMeshLocalGeometry(mi.mesh, triangleType);
  if (!local) return null;
  const entry = buildWorldEntry(local, matrix);
  worldCache.set(mi, entry);
  return entry;
}

function queryEntry(entry: WorldEntry, x: number, z: number): number | null {
  const fx = (x - entry.minX) * entry.invCellX;
  const fz = (z - entry.minZ) * entry.invCellZ;
  if (fx < -1 || fz < -1 || fx > entry.nx + 1 || fz > entry.nz + 1) return null;
  const ix = Math.min(entry.nx - 1, Math.max(0, Math.floor(fx)));
  const iz = Math.min(entry.nz - 1, Math.max(0, Math.floor(fz)));
  const cell = iz * entry.nx + ix;
  const end = entry.cellStart[cell + 1];
  const p = entry.positions;
  const tris = entry.triangles;
  let best: number | null = null;

  for (let k = entry.cellStart[cell]; k < end; k++) {
    const t = entry.cellTriangles[k];
    const a = tris[t * 3] * 3;
    const b = tris[t * 3 + 1] * 3;
    const c = tris[t * 3 + 2] * 3;
    const ax = p[a];
    const az = p[a + 2];
    const v0x = p[b] - ax;
    const v0z = p[b + 2] - az;
    const v1x = p[c] - ax;
    const v1z = p[c + 2] - az;
    const det = v0x * v1z - v1x * v0z;
    if (Math.abs(det) < 1e-12) continue; // vertical or degenerate in XZ
    const px = x - ax;
    const pz = z - az;
    const u = (px * v1z - v1x * pz) / det;
    const v = (v0x * pz - px * v0z) / det;
    if (u < -BARY_EPS || v < -BARY_EPS || u + v > 1 + BARY_EPS) continue;
    const y = p[a + 1] + u * (p[b + 1] - p[a + 1]) + v * (p[c + 1] - p[a + 1]);
    if (best === null || y > best) best = y;
  }
  return best;
}

/**
 * Highest subject surface Y (world / scene space) at (x, z), or `null` when
 * nothing is above that point or no subject is bound.
 */
export function sampleSubjectSurfaceY(x: number, z: number): number | null {
  const binding = bound;
  if (!binding) return null;
  let best: number | null = null;
  for (const mi of visibleMeshInstances()) {
    const box = mi.aabb;
    const c = box.center;
    const h = box.halfExtents;
    if (Math.abs(x - c.x) > h.x || Math.abs(z - c.z) > h.z) continue;
    const entry = entryFor(mi, binding.triangleType);
    if (!entry) continue;
    const y = queryEntry(entry, x, z);
    if (y !== null && (best === null || y > best)) best = y;
  }
  return best;
}

/** Maximum Y of the visible subject's mesh bounding boxes. */
export function subjectTopY(): number | null {
  let top: number | null = null;
  for (const mi of visibleMeshInstances()) {
    const box = mi.aabb;
    const y = box.center.y + box.halfExtents.y;
    if (top === null || y > top) top = y;
  }
  return top;
}
