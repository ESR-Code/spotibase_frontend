"use client";

import { useEffect } from "react";
import { confirmDelete, useConfirmStore } from "@/lib/editor/confirm";
import { toggleEditorPreview } from "@/lib/editor/preview/toggle-preview";
import { toast } from "@/lib/editor/toast";
import { clearEditorSelection } from "@/lib/editor/state/exclusive-selection";
import { useAlignmentSessionStore } from "@/lib/editor/state/alignment-session-store";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useLayersStore } from "@/lib/editor/state/layers-store";
import { syncActiveSceneLayers } from "@/lib/editor/state/scenes-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import { useUIStore } from "@/lib/editor/state/ui-store";

/**
 * A dialog or flow owns the keyboard: the shortcuts below must not act on the
 * editor behind it (Delete removing the selected hotspot under the Assets
 * dialog, P toggling Preview under Publish).
 */
function isKeyboardOwnedByDialog(ui: ReturnType<typeof useUIStore.getState>) {
  return (
    useConfirmStore.getState().current != null ||
    ui.actionsModal != null ||
    ui.scenesModalOpen ||
    ui.assetLibraryOpen ||
    ui.publishDialogOpen ||
    useAlignmentSessionStore.getState().open
  );
}

export function useEditorKeyboard() {
  const setMode = useEditorStore((s) => s.setMode);
  const selectedId = useEditorStore((s) => s.selectedId);
  const removeHotspot = useEditorStore((s) => s.removeHotspot);
  const closeAllOverlays = useUIStore((s) => s.closeAllOverlays);
  const setPropertiesDrawerOpen = useUIStore((s) => s.setPropertiesDrawerOpen);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableKeyboardTarget(e.target)) return;
      // Ctrl/Cmd/Alt combos belong to the browser and the OS (Ctrl+A, Ctrl+P, ...),
      // held keys must not repeat a toggle or stack delete confirmations.
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || e.isComposing) return;

      const isPreview = useEditorStore.getState().isPreview;
      const ui = useUIStore.getState();
      // Escape still closes things; every other shortcut yields to a dialog.
      if (isKeyboardOwnedByDialog(ui) && e.key !== "Escape") return;
      if (e.key === "Escape" && useConfirmStore.getState().current) return;
      // Settings drawers sit beside the viewport: destructive keys stay off.
      const isDelete = e.key === "Delete" || e.key === "Backspace";
      if (isDelete && (ui.settingsDrawerOpen || ui.generalSettingsDrawerOpen)) {
        return;
      }
      const previewOpen = ui.previewModalOpen;
      const actionsOpen = ui.actionsModal != null;

      if (e.key === "p" || e.key === "P") {
        toggleEditorPreview();
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
        const id = selectedId;
        void confirmDelete("hotspot").then((ok) => {
          if (!ok) return;
          removeHotspot(id);
          setPropertiesDrawerOpen(false);
          toast.success("Hotspot deleted");
        });
      } else if (
        !isPreview &&
        !actionsOpen &&
        (e.key === "Delete" || e.key === "Backspace") &&
        useLayersStore.getState().selectedId
      ) {
        const layerId = useLayersStore.getState().selectedId;
        if (layerId) {
          void confirmDelete("layer").then((ok) => {
            if (!ok) return;
            useLayersStore.getState().removeLayer(layerId);
            syncActiveSceneLayers();
            toast.success("Overlay deleted");
          });
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

export function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest("[contenteditable='true']"));
}
