"use client";

import { Loader2, Save } from "lucide-react";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import { useAssetsStore } from "@/lib/editor/assets/assets-store";
import { saveProject, useProjectPersistStore } from "@/lib/editor/persist/persist-store";

function savedAgo(at: number): string {
  const minutes = Math.max(0, Math.round((Date.now() - at) / 60000));
  if (minutes < 1) return "Saved just now";
  if (minutes < 60) return `Saved ${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Saved ${hours}h ago`;
  return `Saved ${Math.round(hours / 24)}d ago`;
}

export function SaveButton() {
  const bound = useProjectPersistStore((s) => s.projectId !== null);
  const dirty = useProjectPersistStore((s) => s.dirty);
  const status = useProjectPersistStore((s) => s.status);
  const error = useProjectPersistStore((s) => s.error);
  const lastSavedAt = useProjectPersistStore((s) => s.lastSavedAt);
  const uploading = useAssetsStore((s) => s.pendingUploads > 0);

  if (!bound) return null;

  const saving = status === "saving";
  const conflict = status === "conflict";
  const failed = status === "error";

  const statusLabel = saving
    ? "Saving…"
    : conflict
      ? "Saved elsewhere"
      : uploading
        ? "Uploading…"
        : failed
          ? "Couldn’t save"
          : dirty
            ? "Unsaved"
            : lastSavedAt
              ? savedAgo(lastSavedAt)
              : "Saved";

  const title = conflict
    ? "This project was saved elsewhere. Reload to get the latest version."
    : failed
      ? (error ?? "Could not save the project")
      : uploading
        ? "Wait for uploads to finish before saving"
        : "Save project (Ctrl/Cmd+S)";

  return (
    <div className="flex items-center gap-2">
      {conflict ? (
        <button
          type="button"
          className="editor-header-save-status is-action"
          title={title}
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
      ) : (
        <span
          className={`editor-header-save-status${dirty || failed ? " is-warn" : ""}`}
          title={failed ? title : statusLabel}
        >
          {statusLabel}
        </span>
      )}
      <EditorButton
        variant="primary"
        className="editor-header-save h-8 gap-1.5 px-3 text-[12px]"
        title={title}
        disabled={saving || uploading || conflict || (!dirty && !failed)}
        onClick={() => void saveProject()}
      >
        {saving || uploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Save className="h-3.5 w-3.5" />
        )}
        Save
      </EditorButton>
    </div>
  );
}
