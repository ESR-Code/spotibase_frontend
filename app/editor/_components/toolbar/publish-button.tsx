"use client";

import { Upload } from "lucide-react";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import { useProjectPersistStore } from "@/lib/editor/persist/persist-store";
import { useUIStore } from "@/lib/editor/state/ui-store";

/** Opens the publish settings dialog. Hidden until the editor is bound to a project. */
export function PublishButton() {
  const bound = useProjectPersistStore((s) => s.projectId !== null);
  const setOpen = useUIStore((s) => s.setPublishDialogOpen);
  if (!bound) return null;

  return (
    <EditorButton
      className="editor-header-btn editor-header-btn-publish"
      title="Publish settings"
      aria-label="Publish"
      onClick={() => setOpen(true)}
    >
      <Upload className="h-3.5 w-3.5" />
      <span className="editor-header-btn-label">Publish</span>
    </EditorButton>
  );
}
