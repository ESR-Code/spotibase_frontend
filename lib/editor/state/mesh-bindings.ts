"use client";

import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useModelStore, type ModelMeshEntry } from "@/lib/editor/state/model-store";
import { listPreviewHotspots } from "@/lib/editor/state/preview-hotspots";
import { isPreviewHotspotEnabled } from "@/lib/editor/state/preview-visibility-store";
import { getSceneType } from "@/lib/editor/scene-types/registry";
import { useActiveScene, useScenesStore } from "@/lib/editor/state/scenes-store";
import { useUIStore } from "@/lib/editor/state/ui-store";
import { isMeshBoundHotspot, type Hotspot } from "@/lib/editor/types/hotspot";
import { LEGEND_CATEGORY_ALL } from "@/lib/editor/types/legend-category";
import type { SceneTypeId } from "@/lib/editor/types/scene-type";

/**
 * - `ok`: the mesh is in the loaded model.
 * - `missing`: the model is loaded but has no mesh with this id (renamed / replaced).
 * - `pending`: the model is still loading. Don't warn yet.
 * - `unsupported`: not a 3D model scene; the binding is ignored.
 * - `none`: a regular marker hotspot.
 */
export type MeshBindingStatus = "ok" | "missing" | "pending" | "unsupported" | "none";

export function meshBindingStatus(
  hotspot: Pick<Hotspot, "meshId">,
  context: { sceneType: SceneTypeId; engineReady: boolean; meshes: ModelMeshEntry[] },
): MeshBindingStatus {
  if (!isMeshBoundHotspot(hotspot)) return "none";
  if (!getSceneType(context.sceneType).meshClick) return "unsupported";
  if (!context.engineReady || context.meshes.length === 0) return "pending";
  return context.meshes.some((mesh) => mesh.id === hotspot.meshId) ? "ok" : "missing";
}

export function useMeshBinding(
  hotspot: Pick<Hotspot, "meshId"> | null | undefined,
): MeshBindingStatus {
  const sceneType = useActiveScene().type;
  const engineReady = useModelStore((s) => s.engineReady);
  const meshes = useModelStore((s) => s.meshes);
  if (!hotspot) return "none";
  return meshBindingStatus(hotspot, { sceneType, engineReady, meshes });
}

function meshClickActive(): boolean {
  const scenes = useScenesStore.getState();
  const type = scenes.scenes.find((s) => s.id === scenes.activeSceneId)?.type ?? "model";
  return getSceneType(type).meshClick;
}

/** True when the scene has at least one hotspot that a mesh click could trigger. */
export function hasMeshBoundHotspots(): boolean {
  if (!meshClickActive()) return false;
  return listPreviewHotspots().some(isMeshBoundHotspot);
}

/**
 * Hotspot a click on `meshId` should trigger. In Preview it must also be
 * clickable right now (enabled, legend filter). First match wins if bad data
 * binds the same mesh twice.
 */
export function findMeshBoundHotspotId(meshId: string | null): number | null {
  if (!meshId || !meshClickActive()) return null;
  const { isPreview } = useEditorStore.getState();
  const legendFilter = useUIStore.getState().legendFilterCategory;
  for (const hotspot of listPreviewHotspots()) {
    if (hotspot.meshId !== meshId) continue;
    if (isPreview) {
      if (!isPreviewHotspotEnabled(true, hotspot.id)) continue;
      if (legendFilter !== LEGEND_CATEGORY_ALL && hotspot.category !== legendFilter) {
        continue;
      }
    }
    return hotspot.id;
  }
  return null;
}

/** Authored hotspot already bound to `meshId` (editor "Make clickable" / "Edit"). */
export function authoredHotspotForMesh(
  hotspots: Hotspot[],
  meshId: string,
): Hotspot | undefined {
  return hotspots.find((hotspot) => hotspot.meshId === meshId);
}
