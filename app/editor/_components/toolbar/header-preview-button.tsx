"use client";

import { Play, Square } from "lucide-react";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import { toggleEditorPreview } from "@/lib/editor/preview/toggle-preview";
import { useEditorStore } from "@/lib/editor/state/editor-store";

export function HeaderPreviewButton() {
  const isPreview = useEditorStore((s) => s.isPreview);

  return (
    <EditorButton
      className={`editor-header-btn editor-header-btn-preview${isPreview ? " is-active" : ""}`}
      title={isPreview ? "Stop preview (P)" : "Preview (P)"}
      aria-label={isPreview ? "Stop preview" : "Preview"}
      aria-pressed={isPreview}
      onClick={() => toggleEditorPreview()}
    >
      {isPreview ? (
        <Square className="h-3.5 w-3.5 fill-current" />
      ) : (
        <Play className="h-3.5 w-3.5 fill-current" />
      )}
    </EditorButton>
  );
}
