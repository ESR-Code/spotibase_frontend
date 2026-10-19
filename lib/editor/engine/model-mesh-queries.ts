import type { Vec3 } from "@/lib/editor/types/hotspot";

/**
 * Engine-backed mesh queries for UI and action code (bound by the model
 * manager), so callers never touch PlayCanvas instances. Same pattern as
 * `subject-surface.ts` / `model-animation.ts`.
 */
type ModelMeshQueries = {
  /** World-space bounding-box centre of a catalog mesh, or null if it isn't loaded. */
  getCenter: (meshId: string) => Vec3 | null;
};

let bound: ModelMeshQueries | null = null;

export function bindModelMeshQueries(queries: ModelMeshQueries): void {
  bound = queries;
}

export function unbindModelMeshQueries(): void {
  bound = null;
}

export function getModelMeshCenter(meshId: string): Vec3 | null {
  return bound?.getCenter(meshId) ?? null;
}
