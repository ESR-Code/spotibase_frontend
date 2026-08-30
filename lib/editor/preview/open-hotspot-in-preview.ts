import { useEditorStore } from "@/lib/editor/state/editor-store";
import { listPreviewHotspots } from "@/lib/editor/state/preview-hotspots";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import { useUIStore } from "@/lib/editor/state/ui-store";

/** Delay before the select-pinned label fades back in after a click. */
const SELECT_LABEL_REVEAL_MS = 280;

/** Fly the viewport camera to this hotspot (custom pose when set). */
export function focusHotspotCamera(id: number) {
  window.dispatchEvent(
    new CustomEvent("editor:focus-hotspot", {
      detail: { id },
    }),
  );
}

/**
 * Shared preview selection path: focus camera, set active hotspot, open marker dialog.
 * Used by canvas picking and the Legend drawer.
 */
export function openHotspotInPreview(id: number) {
  const editor = useEditorStore.getState();
  const hotspots = listPreviewHotspots();
  const index = hotspots.findIndex((h) => h.id === id);
  if (index < 0) return;

  const hotspot = hotspots[index];
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

  focusHotspotCamera(hotspot.id);

  // Drop stale anchor so the info box repositions on the next frame.
  if (settings.markerDialogPresentation === "infobox") {
    ui.setInfoBoxAnchor(null);
  }

  ui.setPreviewModalOpen(true);
}
