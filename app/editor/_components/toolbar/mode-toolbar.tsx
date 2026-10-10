"use client";

import { MousePointer2, Plus, Workflow } from "lucide-react";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useUIStore } from "@/lib/editor/state/ui-store";

export function ModeToolbar() {
  const mode = useEditorStore((s) => s.mode);
  const isPreview = useEditorStore((s) => s.isPreview);
  const setMode = useEditorStore((s) => s.setMode);
  const actionsModal = useUIStore((s) => s.actionsModal);
  const openActionsModal = useUIStore((s) => s.openActionsModal);
  const sceneActionsOpen = actionsModal?.kind === "scene";

  const handleMode = (next: "select" | "add") => {
    if (isPreview) return;
    setMode(next);
  };

  return (
    <div
      className="flex items-center gap-1 rounded-xl p-1"
      style={{
        background: "rgba(11,20,36,0.6)",
        border: "1px solid var(--editor-line)",
      }}
    >
      <button
        type="button"
        disabled={isPreview}
        className={`editor-tool-btn ${!isPreview && mode === "select" ? "active" : ""} ${isPreview ? "disabled" : ""}`}
        onClick={() => handleMode("select")}
      >
        <MousePointer2 className="h-3 w-3" />
        Select
      </button>
      <button
        type="button"
        disabled={isPreview}
        className={`editor-tool-btn ${!isPreview && mode === "add" ? "active" : ""} ${isPreview ? "disabled" : ""}`}
        onClick={() => handleMode("add")}
      >
        <Plus className="h-3 w-3" />
        Add Hotspot
      </button>
      <div className="editor-vsep" style={{ height: 18 }} />
      <button
        type="button"
        disabled={isPreview}
        className={`editor-tool-btn ${!isPreview && sceneActionsOpen ? "active" : ""} ${isPreview ? "disabled" : ""}`}
        onClick={() => {
          if (!isPreview) openActionsModal({ kind: "scene" });
        }}
      >
        <Workflow className="h-3 w-3" />
        Actions
      </button>
    </div>
  );
}
