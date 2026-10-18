"use client";

import { Play, SquarePen } from "lucide-react";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import { toggleEditorPreview } from "@/lib/editor/preview/toggle-preview";
import { useEditorStore } from "@/lib/editor/state/editor-store";

export function HeaderPreviewButton() {
  const isPreview = useEditorStore((s) => s.isPreview);

  return (
    <EditorButton
      variant="outline"
      className={`editor-header-btn${isPreview ? " is-active" : ""}`}
      title={isPreview ? "Back to the editor (P)" : "Preview (P)"}
      aria-label={isPreview ? "Back to the editor" : "Preview"}
      aria-pressed={isPreview}
      onClick={() => toggleEditorPreview()}
    >
      {isPreview ? (
        <SquarePen className="h-3.5 w-3.5" />
      ) : (
        <Play className="h-3.5 w-3.5" />
      )}
      <span className="editor-header-btn-label">{isPreview ? "Editor" : "Preview"}</span>
    </EditorButton>
  );
}
