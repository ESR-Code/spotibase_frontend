import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import { useUIStore } from "@/lib/editor/state/ui-store";

/** Delay before the select-pinned label fades back in after a click. */
const SELECT_LABEL_REVEAL_MS = 280;

/**
 * Shared preview selection path: focus camera, set active hotspot, open marker dialog.
 * Used by canvas picking and the Legend drawer.
 */
export function openHotspotInPreview(id: number) {
  const editor = useEditorStore.getState();
  const index = editor.hotspots.findIndex((h) => h.id === id);
  if (index < 0) return;

  const hotspot = editor.hotspots[index];
  const ui = useUIStore.getState();
  const settings = useSettingsStore.getState();

  ui.setSettingsDrawerOpen(false);
  ui.setGeneralSettingsDrawerOpen(false);
  ui.setPreviewActiveHotspotId(hotspot.id);
  ui.setPreviewModalIndex(index);
  editor.setHoveredHotspot(null);

  // Match canvas pick label reveal (hotspot-manager shows the pinned label after).
  ui.setHoverTooltip(null);
  ui.setPreviewLabelPending(true);
  if (!settings.previewShowLabelOnSelect) {
    ui.setPreviewLabelPending(false);
  } else {
    window.setTimeout(() => {
      const state = useUIStore.getState();
      if (state.previewActiveHotspotId === id) {
        state.setPreviewLabelPending(false);
      }
    }, SELECT_LABEL_REVEAL_MS);
  }

  window.dispatchEvent(
    new CustomEvent("editor:focus-hotspot", {
      detail: { id: hotspot.id },
    }),
  );

  if (settings.markerDialogPresentation !== "off") {
    ui.setPreviewModalOpen(true);
  }
}
