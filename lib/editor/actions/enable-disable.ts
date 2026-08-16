import { useEditorStore } from "@/lib/editor/state/editor-store";
import { usePreviewVisibilityStore } from "@/lib/editor/state/preview-visibility-store";
import { useUIStore } from "@/lib/editor/state/ui-store";
import type { EnableDisableActionNode } from "@/lib/editor/types/hotspot-action";

export function validateEnableDisableData(
  _data: EnableDisableActionNode["data"],
): string | null {
  return null;
}

/**
 * Apply per-item enable state for the current Preview session only.
 * Checked (not in disabled lists) → show; unchecked → hide.
 * Editor visibility is left unchanged.
 */
export function applyEnableDisable(
  data: EnableDisableActionNode["data"],
): void {
  usePreviewVisibilityStore
    .getState()
    .apply(data.disabledHotspotIds, data.disabledLayerIds);

  const editor = useEditorStore.getState();
  const ui = useUIStore.getState();
  const hoveredId = editor.hoveredId;
  const activeId = ui.previewActiveHotspotId;
  const hidesHovered =
    hoveredId != null && data.disabledHotspotIds.includes(hoveredId);
  const hidesActive =
    activeId != null && data.disabledHotspotIds.includes(activeId);

  if (hidesHovered) editor.setHoveredHotspot(null);
  if (hidesHovered || hidesActive || ui.hoverTooltip) {
    ui.setHoverTooltip(null);
  }
  if (hidesActive) {
    ui.setPreviewLabelPending(false);
    ui.setInfoBoxAnchor(null);
  }
}
