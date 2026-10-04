"use client";

import { AlertTriangle, Check, Loader2, Save } from "lucide-react";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import { useAssetsStore } from "@/lib/editor/assets/assets-store";
import { saveProject, useProjectPersistStore } from "@/lib/editor/persist/persist-store";

export function SaveButton() {
  const bound = useProjectPersistStore((s) => s.projectId !== null);
  const dirty = useProjectPersistStore((s) => s.dirty);
  const status = useProjectPersistStore((s) => s.status);
  const uploading = useAssetsStore((s) => s.pendingUploads > 0);

  if (!bound) return null;

  const saving = status === "saving";
  const conflict = status === "conflict";
  const label = saving
    ? "Saving…"
    : conflict
      ? "Conflict"
      : uploading
        ? "Uploading…"
        : dirty || status === "error"
          ? "Save"
          : "Saved";
  const title = conflict
    ? "This project was saved elsewhere. Reload to get the latest version."
    : uploading
      ? "Wait for uploads to finish before saving"
      : "Save project (Ctrl/Cmd+S)";

  return (
    <EditorButton
      variant={dirty && !conflict ? "primary" : "default"}
      className="h-8 gap-1.5 px-3 text-[12px]"
      title={title}
      disabled={saving || uploading || conflict || (!dirty && status !== "error")}
      onClick={() => void saveProject()}
    >
      {saving || uploading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : conflict ? (
        <AlertTriangle className="h-3.5 w-3.5" />
      ) : dirty || status === "error" ? (
        <Save className="h-3.5 w-3.5" />
      ) : (
        <Check className="h-3.5 w-3.5" />
      )}
      {label}
    </EditorButton>
  );
}
