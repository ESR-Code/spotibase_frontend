"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import { useUIStore } from "@/lib/editor/state/ui-store";
import { LEGEND_CATEGORY_ALL } from "@/lib/editor/types/legend-category";

export function useEditorKeyboard() {
  const setMode = useEditorStore((s) => s.setMode);
  const selectedId = useEditorStore((s) => s.selectedId);
  const removeHotspot = useEditorStore((s) => s.removeHotspot);
  const selectHotspot = useEditorStore((s) => s.selectHotspot);
  const closeAllOverlays = useUIStore((s) => s.closeAllOverlays);
  const setPropertiesDrawerOpen = useUIStore((s) => s.setPropertiesDrawerOpen);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

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
          ui.setLegendDrawerOpen(false);
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
          selectHotspot(null);
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
        selectHotspot(null);
      } else if (
        !isPreview &&
        !actionsOpen &&
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedId != null
      ) {
        removeHotspot(selectedId);
        setPropertiesDrawerOpen(false);
        toast.success("Hotspot deleted");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    closeAllOverlays,
    removeHotspot,
    selectHotspot,
    selectedId,
    setMode,
    setPropertiesDrawerOpen,
  ]);
}
