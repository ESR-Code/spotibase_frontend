"use client";

import { useEffect } from "react";
import { hasUnsavedChanges, saveProject } from "@/lib/editor/persist/persist-store";

/** Ctrl/Cmd+S saves (also from text fields); unsaved changes warn on unload. */
export function useProjectSaveShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveProject();
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) e.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []);
}
