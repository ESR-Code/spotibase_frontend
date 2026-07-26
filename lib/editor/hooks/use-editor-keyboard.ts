"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useUIStore } from "@/lib/editor/state/ui-store";

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
      const previewOpen = useUIStore.getState().previewModalOpen;

      if (e.key === "p" || e.key === "P") {
        const wasPreview = isPreview;
        setMode("preview");
        if (wasPreview) {
          const ui = useUIStore.getState();
          ui.setPreviewModalOpen(false);
          ui.setPreviewActiveHotspotId(null);
          ui.setPreviewLabelPending(false);
          ui.setHoverTooltip(null);
          window.dispatchEvent(new CustomEvent("editor:reset-camera"));
        } else {
          closeAllOverlays();
          setPropertiesDrawerOpen(false);
          selectHotspot(null);
        }
        return;
      }

      if ((e.key === "v" || e.key === "V") && !isPreview) setMode("select");
      else if ((e.key === "a" || e.key === "A") && !isPreview) setMode("add");
      else if (e.key === "Escape") {
        if (previewOpen) {
          window.dispatchEvent(new CustomEvent("editor:reset-camera"));
        }
        closeAllOverlays();
        setPropertiesDrawerOpen(false);
        selectHotspot(null);
      } else if (
        !isPreview &&
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
