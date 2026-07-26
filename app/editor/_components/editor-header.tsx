"use client";

import { PenTool } from "lucide-react";
import { EditorChip } from "@/app/editor/_components/ui/editor-chip";
import { ModeToolbar } from "@/app/editor/_components/toolbar/mode-toolbar";
import { FileMenu } from "@/app/editor/_components/toolbar/file-menu";
import { PROJECT_NAME } from "@/lib/editor/theme/tokens";

export function EditorHeader() {
  return (
    <header
      className="editor-glass editor-panel-shadow z-20 flex items-center gap-4 px-5 py-3"
      style={{ borderBottom: "1px solid var(--editor-line)" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="relative flex h-9 w-9 items-center justify-center rounded-lg"
          style={{
            background: "linear-gradient(135deg,#e63946,#7a1622)",
            boxShadow: "0 6px 20px -6px rgba(230,57,70,0.7)",
          }}
        >
          <PenTool className="h-4 w-4 text-white" />
          <div
            className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full"
            style={{
              background: "var(--editor-teal)",
              boxShadow: "0 0 8px var(--editor-teal)",
              border: "2px solid var(--editor-bg)",
            }}
          />
        </div>
        <div>
          <div className="font-display text-[15px] font-bold leading-none">
            VectorForge
          </div>
          <div
            className="mt-1 text-[10px] uppercase tracking-[0.18em]"
            style={{ color: "var(--editor-muted-2)" }}
          >
            3D Hotspot Studio
          </div>
        </div>
      </div>

      <div className="editor-vsep" />

      <div className="hidden items-center gap-3 md:flex">
        <div>
          <div
            className="text-[10px] uppercase tracking-wider"
            style={{ color: "var(--editor-muted-2)" }}
          >
            Project
          </div>
          <div className="flex items-center gap-2 text-[13px] font-semibold">
            {PROJECT_NAME}
            <EditorChip
              style={{
                color: "var(--editor-teal)",
                borderColor: "rgba(63,184,175,0.3)",
              }}
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--editor-teal)" }}
              />
              Live
            </EditorChip>
          </div>
        </div>
      </div>

      <div className="flex flex-1 justify-center">
        <ModeToolbar />
      </div>

      <FileMenu />

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
