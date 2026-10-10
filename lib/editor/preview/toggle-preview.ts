import { clearEditorSelection } from "@/lib/editor/state/exclusive-selection";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useUIStore } from "@/lib/editor/state/ui-store";
import { LEGEND_CATEGORY_ALL } from "@/lib/editor/types/legend-category";

/** Enter Preview, or leave it and return to the editor. Shared by the header and the P key. */
export function toggleEditorPreview(): void {
  const entering = !useEditorStore.getState().isPreview;
  const ui = useUIStore.getState();
  useEditorStore.getState().setMode("preview");

  if (entering) {
    const keepGeneralSettings = ui.generalSettingsDrawerOpen;
    ui.closeAllOverlays();
    if (keepGeneralSettings) {
      useUIStore.getState().setGeneralSettingsDrawerOpen(true);
    }
    useUIStore.getState().setPropertiesDrawerOpen(false);
    useUIStore.getState().setOutlinerCollapsed(true);
    clearEditorSelection();
    return;
  }

  ui.setPreviewModalOpen(false);
  ui.setPreviewActiveHotspotId(null);
  ui.setPreviewLabelPending(false);
  ui.setHoverTooltip(null);
  ui.setInfoBoxAnchor(null);
  ui.setLegendDrawerOpen(false);
  ui.setSceneExplorerDrawerOpen(false);
  ui.setLegendFilterCategory(LEGEND_CATEGORY_ALL);
  window.dispatchEvent(new CustomEvent("editor:reset-camera"));
}
