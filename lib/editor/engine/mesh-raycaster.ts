import type { Entity, MeshInstance } from "playcanvas";
import type * as pc from "playcanvas";
import { getMeshLocalGeometry } from "@/lib/editor/engine/mesh-geometry";
import type { CollectedModelMesh } from "@/lib/editor/engine/model-meshes";
import { screenRayFromEvent } from "@/lib/editor/engine/ray-utils";

export type MeshRaycaster = {
  /** Catalog id of the model mesh whose surface is nearest under the pointer, or null. */
  pickMeshId: (clientX: number, clientY: number) => string | null;
  /**
   * Exact world-space surface point under the pointer, or null when no mesh is
   * hit (or the catalog is empty). `normal` is the unit surface normal facing
   * the camera, or null when the hit mesh has no readable triangles. Runs on
   * click only (Add mode).
   */
  pickSurfacePoint: (
    clientX: number,
    clientY: number,
  ) => { point: pc.Vec3; normal: pc.Vec3 | null } | null;
};

type Candidate = { meshInstance: MeshInstance; entity: Entity; id: string };
type BroadHit = { index: number; t: number };

/** Ignore hits this close to the ray origin (camera near plane). */
const MIN_T = 1e-6;

/**
 * CPU picking for mesh-click hotspots, run only on pointer events.
 *
 * 1. Broad phase: ray vs the world AABB of every visible model mesh instance
 *    (PlayCanvas caches `meshInstance.aabb`; this is a cheap slab test each).
 * 2. Narrow phase, front to back: exact ray / triangle test in mesh-local space
 *    (the ray is moved into the mesh's space, so vertices are never transformed).
 *    Candidates are visited in AABB entry order and the search stops once the
 *    next box starts beyond the closest surface found, so usually only one or
 *    two meshes are tested.
 *
 * Every model mesh takes part, clickable or not, so a closer non-clickable mesh
 * occludes a clickable one behind it. Triangles are read once per mesh (shared
 * cache with the surface sampler). Unlike GPU picking this adds no render pass.
 */
export function createMeshRaycaster(
  pcModule: typeof pc,
  camera: Entity,
  canvas: HTMLCanvasElement,
  getMeshes: () => CollectedModelMesh[],
): MeshRaycaster {
  let source: CollectedModelMesh[] | null = null;
  let candidates: Candidate[] = [];
  const hits: BroadHit[] = [];
  const ray = new pcModule.Ray();
  const inverse = new pcModule.Mat4();
  const localOrigin = new pcModule.Vec3();
  const localDir = new pcModule.Vec3();
  /** World normal of the triangle behind the latest `surfaceHit` result. */
  const hitNormal = new pcModule.Vec3();
  let hitHasNormal = false;

  /** Rebuild the flat instance list only when the mesh catalog changes. */
  const refreshCandidates = () => {
    const meshes = getMeshes();
    if (meshes === source) return;
    source = meshes;
    candidates = [];
    for (const item of meshes) {
      for (const meshInstance of item.entity.render?.meshInstances ?? []) {
        candidates.push({ meshInstance, entity: item.entity, id: item.id });
      }
    }
  };

  // Slab-test state, shared to keep the broad phase allocation-free.
  let slabMin = 0;
  let slabMax = 0;
  const slab = (origin: number, dir: number, lo: number, hi: number) => {
    if (Math.abs(dir) < 1e-12) return origin >= lo && origin <= hi;
    let t1 = (lo - origin) / dir;
    let t2 = (hi - origin) / dir;
    if (t1 > t2) {
      const swap = t1;
      t1 = t2;
      t2 = swap;
    }
    if (t1 > slabMin) slabMin = t1;
    if (t2 < slabMax) slabMax = t2;
    return slabMin <= slabMax;
  };

  /** Distance where the ray enters the box (0 if it starts inside), or -1. */
  const aabbEntry = (meshInstance: MeshInstance): number => {
    const box = meshInstance.aabb;
    const c = box.center;
    const h = box.halfExtents;
    const o = ray.origin;
    const d = ray.direction;
    slabMin = -Infinity;
    slabMax = Infinity;
    if (
      !slab(o.x, d.x, c.x - h.x, c.x + h.x) ||
      !slab(o.y, d.y, c.y - h.y, c.y + h.y) ||
      !slab(o.z, d.z, c.z - h.z, c.z + h.z) ||
      slabMax < 0
    ) {
      return -1;
    }
    return Math.max(slabMin, 0);
  };

  /**
   * Nearest surface distance (world units, same `t` as the world ray) closer
   * than `maxT`, or null. Meshes without CPU-readable triangles fall back to
   * their AABB entry distance.
   */
  const surfaceHit = (meshInstance: MeshInstance, aabbT: number, maxT: number) => {
    const geometry = getMeshLocalGeometry(
      meshInstance.mesh,
      pcModule.PRIMITIVE_TRIANGLES,
    );
    if (!geometry) {
      if (aabbT >= maxT) return null;
      hitHasNormal = false;
      return aabbT;
    }

    // The world direction is unit length and transformed (not normalized) into
    // local space, so a local hit `t` is the same distance as in world space.
    inverse.copy(meshInstance.node.getWorldTransform()).invert();
    inverse.transformPoint(ray.origin, localOrigin);
    inverse.transformVector(ray.direction, localDir);
    const ox = localOrigin.x;
    const oy = localOrigin.y;
    const oz = localOrigin.z;
    const dx = localDir.x;
    const dy = localDir.y;
    const dz = localDir.z;

    const p = geometry.positions;
    const tri = geometry.triangles;
    let best = maxT;
    let nx = 0;
    let ny = 0;
    let nz = 0;
    // Möller–Trumbore, double-sided (GLBs often have open or flipped faces).
    for (let i = 0; i < tri.length; i += 3) {
      const a = tri[i]! * 3;
      const b = tri[i + 1]! * 3;
      const c = tri[i + 2]! * 3;
      const ax = p[a]!;
      const ay = p[a + 1]!;
      const az = p[a + 2]!;
      const e1x = p[b]! - ax;
      const e1y = p[b + 1]! - ay;
      const e1z = p[b + 2]! - az;
      const e2x = p[c]! - ax;
      const e2y = p[c + 1]! - ay;
      const e2z = p[c + 2]! - az;
      const px = dy * e2z - dz * e2y;
      const py = dz * e2x - dx * e2z;
      const pz = dx * e2y - dy * e2x;
      const det = e1x * px + e1y * py + e1z * pz;
      if (det > -1e-12 && det < 1e-12) continue;
      const invDet = 1 / det;
      const tx = ox - ax;
      const ty = oy - ay;
      const tz = oz - az;
      const u = (tx * px + ty * py + tz * pz) * invDet;
      if (u < 0 || u > 1) continue;
      const qx = ty * e1z - tz * e1y;
      const qy = tz * e1x - tx * e1z;
      const qz = tx * e1y - ty * e1x;
      const v = (dx * qx + dy * qy + dz * qz) * invDet;
      if (v < 0 || u + v > 1) continue;
      const t = (e2x * qx + e2y * qy + e2z * qz) * invDet;
      if (t > MIN_T && t < best) {
        best = t;
        nx = e1y * e2z - e1z * e2y;
        ny = e1z * e2x - e1x * e2z;
        nz = e1x * e2y - e1y * e2x;
      }
    }
    if (best >= maxT) return null;

    // Local normal -> world via the inverse transpose, flipped to face the ray.
    const m = inverse.data;
    let wx = m[0]! * nx + m[1]! * ny + m[2]! * nz;
    let wy = m[4]! * nx + m[5]! * ny + m[6]! * nz;
    let wz = m[8]! * nx + m[9]! * ny + m[10]! * nz;
    const len = Math.hypot(wx, wy, wz);
    hitHasNormal = len > 1e-12;
    if (hitHasNormal) {
      const facing = wx * ray.direction.x + wy * ray.direction.y + wz * ray.direction.z;
      const s = (facing > 0 ? -1 : 1) / len;
      wx *= s;
      wy *= s;
      wz *= s;
      hitNormal.set(wx, wy, wz);
    }
    return best;
  };

  /** Nearest surface under the pointer: catalog id and ray distance. */
  const pickSurface = (
    clientX: number,
    clientY: number,
  ): { id: string; t: number; normal: pc.Vec3 | null } | null => {
    refreshCandidates();
    if (candidates.length === 0 || !camera.camera) return null;
    screenRayFromEvent(pcModule, camera, canvas, clientX, clientY, ray);

    let hitCount = 0;
    for (let i = 0; i < candidates.length; i++) {
      const { meshInstance, entity } = candidates[i]!;
      if (!entity.enabled || !entity.render?.enabled || meshInstance.visible === false) {
        continue;
      }
      const t = aabbEntry(meshInstance);
      if (t < 0) continue;
      // Reuse hit records between picks.
      const record = hits[hitCount] ?? (hits[hitCount] = { index: 0, t: 0 });
      record.index = i;
      record.t = t;
      hitCount += 1;
    }
    hits.length = hitCount;
    if (hits.length === 0) return null;
    hits.sort((a, b) => a.t - b.t);

    let bestT = Infinity;
    let bestId: string | null = null;
    let bestNormal: pc.Vec3 | null = null;
    for (const hit of hits) {
      // Every remaining box starts behind the closest surface found so far.
      if (hit.t >= bestT) break;
      const candidate = candidates[hit.index]!;
      const t = surfaceHit(candidate.meshInstance, hit.t, bestT);
      if (t != null) {
        bestT = t;
        bestId = candidate.id;
        if (hitHasNormal) (bestNormal ??= new pcModule.Vec3()).copy(hitNormal);
        else bestNormal = null;
      }
    }
    return bestId == null ? null : { id: bestId, t: bestT, normal: bestNormal };
  };

  const pickMeshId = (clientX: number, clientY: number): string | null =>
    pickSurface(clientX, clientY)?.id ?? null;

  const pickSurfacePoint = (clientX: number, clientY: number) => {
    const hit = pickSurface(clientX, clientY);
    if (!hit) return null;
    const point = ray.origin.clone().add(ray.direction.clone().mulScalar(hit.t));
    return { point, normal: hit.normal };
  };

  return { pickMeshId, pickSurfacePoint };
}
