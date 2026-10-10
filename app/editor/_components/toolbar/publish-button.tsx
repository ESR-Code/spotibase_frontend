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
      variant="outline"
      className="h-8 gap-1.5 px-3 text-[12px]"
      title="Publish settings"
      onClick={() => setOpen(true)}
    >
      <Upload className="h-3.5 w-3.5" />
      Publish
    </EditorButton>
  );
}
