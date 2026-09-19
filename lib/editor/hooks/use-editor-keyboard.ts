"use client";

import { useEffect } from "react";
import { toast } from "@/lib/editor/toast";
import { clearEditorSelection } from "@/lib/editor/state/exclusive-selection";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useLayersStore } from "@/lib/editor/state/layers-store";
import { syncActiveSceneLayers } from "@/lib/editor/state/scenes-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import { useUIStore } from "@/lib/editor/state/ui-store";
import { LEGEND_CATEGORY_ALL } from "@/lib/editor/types/legend-category";

export function useEditorKeyboard() {
  const setMode = useEditorStore((s) => s.setMode);
  const selectedId = useEditorStore((s) => s.selectedId);
  const removeHotspot = useEditorStore((s) => s.removeHotspot);
  const closeAllOverlays = useUIStore((s) => s.closeAllOverlays);
  const setPropertiesDrawerOpen = useUIStore((s) => s.setPropertiesDrawerOpen);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableKeyboardTarget(e.target)) return;

      const isPreview = useEditorStore.getState().isPreview;
      const ui = useUIStore.getState();
      const previewOpen = ui.previewModalOpen;
      const actionsOpen = ui.actionsModal != null;

      if (e.key === "p" || e.key === "P") {
        const wasPreview = isPreview;
        setMode("preview");
        if (wasPreview) {
          const ui = useUIStore.getState();
          ui.setPreviewModalOpen(false);
          ui.setPreviewActiveHotspotId(null);
          ui.setPreviewLabelPending(false);
          ui.setHoverTooltip(null);
          ui.setInfoBoxAnchor(null);
          ui.setLegendDrawerOpen(false);
          ui.setSceneExplorerDrawerOpen(false);
          ui.setLegendFilterCategory(LEGEND_CATEGORY_ALL);
          window.dispatchEvent(new CustomEvent("editor:reset-camera"));
        } else {
          const keepGeneralSettings = ui.generalSettingsDrawerOpen;
          closeAllOverlays();
          if (keepGeneralSettings) {
            useUIStore.getState().setGeneralSettingsDrawerOpen(true);
          }
          setPropertiesDrawerOpen(false);
          useUIStore.getState().setOutlinerCollapsed(true);
          clearEditorSelection();
        }
        return;
      }

      if ((e.key === "v" || e.key === "V") && !isPreview && !actionsOpen) {
        setMode("select");
      } else if ((e.key === "a" || e.key === "A") && !isPreview && !actionsOpen) {
        setMode("add");
      } else if (e.key === "Escape") {
        if (
          previewOpen &&
          useSettingsStore.getState().markerDialogResetCameraOnClose
        ) {
          window.dispatchEvent(new CustomEvent("editor:reset-camera"));
        }
        closeAllOverlays();
        setPropertiesDrawerOpen(false);
        clearEditorSelection();
      } else if (
        !isPreview &&
        !actionsOpen &&
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedId != null
      ) {
        removeHotspot(selectedId);
        setPropertiesDrawerOpen(false);
        toast.success("Hotspot deleted");
      } else if (
        !isPreview &&
        !actionsOpen &&
        (e.key === "Delete" || e.key === "Backspace") &&
        useLayersStore.getState().selectedId
      ) {
        const layerId = useLayersStore.getState().selectedId;
        if (layerId) {
          useLayersStore.getState().removeLayer(layerId);
          syncActiveSceneLayers();
          toast.success("Overlay deleted");
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    closeAllOverlays,
    removeHotspot,
    selectedId,
    setMode,
    setPropertiesDrawerOpen,
  ]);
}

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest("[contenteditable='true']"));
}
