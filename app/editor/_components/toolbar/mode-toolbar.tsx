"use client";

import { Layers, MousePointer2, Play, Plus, SquarePen } from "lucide-react";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useUIStore } from "@/lib/editor/state/ui-store";

export function ModeToolbar() {
  const mode = useEditorStore((s) => s.mode);
  const isPreview = useEditorStore((s) => s.isPreview);
  const setMode = useEditorStore((s) => s.setMode);
  const closeAllOverlays = useUIStore((s) => s.closeAllOverlays);
  const setPropertiesDrawerOpen = useUIStore((s) => s.setPropertiesDrawerOpen);
  const setPreviewModalOpen = useUIStore((s) => s.setPreviewModalOpen);
  const setPreviewActiveHotspotId = useUIStore((s) => s.setPreviewActiveHotspotId);
  const setPreviewLabelPending = useUIStore((s) => s.setPreviewLabelPending);
  const setHoverTooltip = useUIStore((s) => s.setHoverTooltip);
  const scenesModalOpen = useUIStore((s) => s.scenesModalOpen);
  const setScenesModalOpen = useUIStore((s) => s.setScenesModalOpen);

  const handleMode = (next: "select" | "add" | "preview") => {
    if (next === "preview") {
      const entering = !isPreview;
      setMode("preview");
      if (entering) {
        closeAllOverlays();
        setPropertiesDrawerOpen(false);
        useUIStore.getState().setOutlinerCollapsed(true);
        useEditorStore.getState().selectHotspot(null);
      } else {
        setPreviewModalOpen(false);
        setPreviewActiveHotspotId(null);
        setPreviewLabelPending(false);
        setHoverTooltip(null);
        useUIStore.getState().setLegendDrawerOpen(false);
        window.dispatchEvent(new CustomEvent("editor:reset-camera"));
      }
      return;
    }
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
        className={`editor-tool-btn ${scenesModalOpen ? "active" : ""} ${isPreview ? "disabled" : ""}`}
        onClick={() => {
          if (!isPreview) setScenesModalOpen(true);
        }}
      >
        <Layers className="h-3 w-3" />
        Scenes
      </button>
      <div className="editor-vsep" style={{ height: 18 }} />
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
        className={`editor-tool-btn ${isPreview ? "active" : ""}`}
        onClick={() => handleMode("preview")}
      >
        {isPreview ? (
          <>
            <SquarePen className="h-3 w-3" />
            Editor
          </>
        ) : (
          <>
            <Play className="h-3 w-3" />
            Preview
          </>
        )}
      </button>
    </div>
  );
}
