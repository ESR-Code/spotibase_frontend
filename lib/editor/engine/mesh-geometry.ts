import type { Mesh } from "playcanvas";

/**
 * CPU copy of a mesh's triangles in mesh-local space, read once per `Mesh`
 * (shared by every instance) and cached. Used by the subject surface sampler
 * (Spawn Hotspot Y) and the mesh-click raycaster.
 */
export type LocalGeometry = {
  /** xyz triples in mesh-local space. */
  positions: Float32Array;
  /** Three vertex indices per triangle. */
  triangles: Uint32Array;
};

// WeakMap: a reloaded model brings new Mesh objects, old entries are collected.
const cache = new WeakMap<Mesh, LocalGeometry | null>();

/** Max integer per PlayCanvas vertex data type (TYPE_INT8 … TYPE_UINT16). */
const NORMALIZED_MAX: Record<number, number> = { 0: 127, 1: 255, 2: 32767, 3: 65535 };

/** 1 / max for a normalized integer POSITION stream; 0 when positions are plain values. */
function positionNormalizeScale(mesh: Mesh): number {
  const element = mesh.vertexBuffer?.format.elements.find(
    (item) => item.name === "POSITION",
  );
  if (!element?.normalize) return 0;
  const max = NORMALIZED_MAX[element.dataType];
  return max ? 1 / max : 0;
}

function dequantize(value: number, scale: number): number {
  // Signed normalized values clamp at -1 (glTF / GPU snorm rule).
  return scale ? Math.max(value * scale, -1) : value;
}

function readLocalGeometry(mesh: Mesh, triangleType: number): LocalGeometry | null {
  try {
    const rawPositions: number[] = [];
    const vertexCount = mesh.getPositions(rawPositions);
    if (!vertexCount || rawPositions.length < vertexCount * 3) return null;
    const stride = Math.round(rawPositions.length / vertexCount);
    if (stride < 3) return null;

    let source: number[] | null = null;
    if (mesh.indexBuffer?.[0]) {
      source = [];
      mesh.getIndices(source);
    }

    const tris: number[] = [];
    for (const prim of mesh.primitive) {
      if (!prim || prim.type !== triangleType) continue;
      const base = prim.base ?? 0;
      const baseVertex = prim.baseVertex ?? 0;
      const count = prim.count ?? 0;
      if (prim.indexed && source) {
        for (let i = base; i + 2 < base + count; i += 3) {
          tris.push(
            source[i] + baseVertex,
            source[i + 1] + baseVertex,
            source[i + 2] + baseVertex,
          );
        }
      } else if (!prim.indexed) {
        for (let i = base; i + 2 < base + count; i += 3) {
          tris.push(i, i + 1, i + 2);
        }
      }
    }
    if (tris.length === 0) return null;

    // Quantized meshes (KHR_mesh_quantization) come back as raw integers.
    const scale = positionNormalizeScale(mesh);
    const positions = new Float32Array(vertexCount * 3);
    for (let v = 0; v < vertexCount; v++) {
      positions[v * 3] = dequantize(rawPositions[v * stride], scale);
      positions[v * 3 + 1] = dequantize(rawPositions[v * stride + 1], scale);
      positions[v * 3 + 2] = dequantize(rawPositions[v * stride + 2], scale);
    }
    return { positions, triangles: Uint32Array.from(tris) };
  } catch {
    // Buffers without CPU readback (or exotic formats): treat as a miss.
    return null;
  }
}

/**
 * Triangles of `mesh` (`triangleType` = `pc.PRIMITIVE_TRIANGLES`), or null when
 * the mesh has no CPU-readable data.
 */
export function getMeshLocalGeometry(mesh: Mesh, triangleType: number): LocalGeometry | null {
  if (cache.has(mesh)) return cache.get(mesh) ?? null;
  const geometry = readLocalGeometry(mesh, triangleType);
  cache.set(mesh, geometry);
  return geometry;
}
