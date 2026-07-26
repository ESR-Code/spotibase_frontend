"use client";

import { useEffect } from "react";
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

      if (e.key === "v" || e.key === "V") setMode("select");
      else if (e.key === "a" || e.key === "A") setMode("add");
      else if (e.key === "p" || e.key === "P") setMode("preview");
      else if (e.key === "Escape") {
        closeAllOverlays();
        setPropertiesDrawerOpen(false);
        selectHotspot(null);
      } else if (e.key === "Delete" && selectedId != null) {
        removeHotspot(selectedId);
        setPropertiesDrawerOpen(false);
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
