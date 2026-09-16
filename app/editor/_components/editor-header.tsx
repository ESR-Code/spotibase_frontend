"use client";

import { PenTool } from "lucide-react";
import { EditorChip } from "@/app/editor/_components/ui/editor-chip";
import { ModeToolbar } from "@/app/editor/_components/toolbar/mode-toolbar";
import { getSceneType } from "@/lib/editor/scene-types/registry";
import { useActiveScene } from "@/lib/editor/state/scenes-store";
import { PROJECT_NAME } from "@/lib/editor/theme/tokens";

export function EditorHeader() {
  const activeScene = useActiveScene();
  const sceneTypeLabel = getSceneType(activeScene.type).label;

  return (
    <header
      className="editor-glass editor-panel-shadow z-20 flex items-center gap-4 px-5 py-3"
      style={{ borderBottom: "1px solid var(--editor-line)" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{
            background: "linear-gradient(135deg,#e63946,#7a1622)",
            boxShadow: "0 6px 20px -6px rgba(230,57,70,0.7)",
          }}
        >
          <PenTool className="h-4 w-4 text-white" />
        </div>
        <div className="font-display text-[15px] font-bold leading-none">
          VectorForge
        </div>
      </div>

      <div className="editor-vsep" />

      <div className="hidden items-center gap-3 md:flex">
        <div className="flex items-center gap-2 text-[13px] font-semibold">
          <span className="truncate">{PROJECT_NAME}</span>
          <span style={{ color: "var(--editor-muted-2)" }}>›</span>
          <span className="truncate">{activeScene.name}</span>
          <EditorChip
            style={{
              color: "var(--editor-teal)",
              borderColor: "rgba(63,184,175,0.3)",
            }}
          >
            {sceneTypeLabel}
          </EditorChip>
        </div>
      </div>

      <div className="flex flex-1 justify-center">
        <ModeToolbar />
      </div>

      <div className="editor-vsep" />

      <div
        className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold"
        style={{
          background: "linear-gradient(135deg,#3fb8af,#1d6b66)",
          color: "#0b1424",
        }}
      >
        MK
      </div>
    </header>
  );
}
