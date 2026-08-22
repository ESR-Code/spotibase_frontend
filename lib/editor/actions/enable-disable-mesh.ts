import { usePreviewVisibilityStore } from "@/lib/editor/state/preview-visibility-store";
import type { EnableDisableMeshActionNode } from "@/lib/editor/types/hotspot-action";

export function validateEnableDisableMeshData(
  data: EnableDisableMeshActionNode["data"],
): string | null {
  void data;
  return null;
}

/**
 * Apply per-mesh visibility for the current Preview session only.
 * Checked (not in disabledMeshIds) → show; unchecked → hide.
 * Editor visibility is left unchanged.
 */
export function applyEnableDisableMesh(
  data: EnableDisableMeshActionNode["data"],
): void {
  usePreviewVisibilityStore
    .getState()
    .applyMeshes(data.disabledMeshIds ?? []);
}
