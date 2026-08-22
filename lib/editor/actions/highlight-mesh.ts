import { usePreviewMeshHighlightStore } from "@/lib/editor/state/preview-mesh-highlight-store";
import type { HighlightMeshActionNode } from "@/lib/editor/types/hotspot-action";

export const DEFAULT_MESH_TINT_COLOR = "#ffd166";
export const DEFAULT_MESH_TINT_OPACITY = 0.45;
export const DEFAULT_MESH_STROKE_COLOR = "#ffffff";
export const DEFAULT_MESH_STROKE_WIDTH = 1;

export function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

export function validateHighlightMeshData(
  data: HighlightMeshActionNode["data"],
): string | null {
  if (!data.meshIds.length) return "Select at least one mesh";
  const tintEnabled = data.tintEnabled !== false;
  const strokeEnabled = Boolean(data.strokeEnabled);
  if (!tintEnabled && !strokeEnabled) {
    return "Enable tint or stroke";
  }
  if (tintEnabled && !isHexColor(data.tintColor.trim())) {
    return "Pick a valid tint color";
  }
  if (strokeEnabled && !isHexColor(data.strokeColor.trim())) {
    return "Pick a valid stroke color";
  }
  return null;
}

/**
 * Apply mesh tint / outline for the current Preview session only.
 * Editor materials are left unchanged.
 */
export function applyHighlightMesh(
  data: HighlightMeshActionNode["data"],
): void {
  const opacity =
    typeof data.tintOpacity === "number" && Number.isFinite(data.tintOpacity)
      ? Math.min(1, Math.max(0, data.tintOpacity))
      : DEFAULT_MESH_TINT_OPACITY;
  usePreviewMeshHighlightStore.getState().apply({
    meshIds: data.meshIds ?? [],
    tintEnabled: data.tintEnabled !== false,
    tintColor: data.tintColor.trim() || DEFAULT_MESH_TINT_COLOR,
    tintOpacity: opacity,
    strokeEnabled: Boolean(data.strokeEnabled),
    strokeColor: data.strokeColor.trim() || DEFAULT_MESH_STROKE_COLOR,
    strokeWidth:
      typeof data.strokeWidth === "number" && Number.isFinite(data.strokeWidth)
        ? Math.min(4, Math.max(1, data.strokeWidth))
        : DEFAULT_MESH_STROKE_WIDTH,
  });
}
