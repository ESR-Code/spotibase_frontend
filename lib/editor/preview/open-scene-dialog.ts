import { findActiveSceneDialog } from "@/lib/editor/dialogs/scene-dialogs";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useUIStore } from "@/lib/editor/state/ui-store";

/**
 * Show a scene dialog in the Preview dialog slot (the one hotspot dialogs use).
 * Unlike `openHotspotInPreview` it does not move the camera.
 * Returns false when the dialog does not exist in the active scene.
 */
export function openSceneDialogInPreview(id: string): boolean {
  if (!findActiveSceneDialog(id)) return false;
  const ui = useUIStore.getState();
  ui.setSettingsDrawerOpen(false);
  ui.setGeneralSettingsDrawerOpen(false);
  ui.setPreviewActiveHotspotId(null);
  ui.setPreviewLabelPending(false);
  ui.setHoverTooltip(null);
  ui.setInfoBoxAnchor(null);
  useEditorStore.getState().setHoveredHotspot(null);
  ui.setPreviewDialogId(id);
  ui.setPreviewModalOpen(true);
  return true;
}
