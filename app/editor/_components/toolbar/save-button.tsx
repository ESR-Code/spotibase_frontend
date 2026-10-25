"use client";

import { Download, Loader2, RefreshCw, Save, Upload } from "lucide-react";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAssetsStore } from "@/lib/editor/assets/assets-store";
import { confirmDelete } from "@/lib/editor/confirm";
import { downloadProjectBackup } from "@/lib/editor/persist/backup";
import {
  overwriteSavedProject,
  saveProject,
  useProjectPersistStore,
} from "@/lib/editor/persist/persist-store";
import { toast } from "@/lib/editor/toast";

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
  const canSave = !saving && !uploading && !conflict && (dirty || failed);

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
    ? "This project was saved elsewhere. Choose how to continue."
    : failed
      ? (error ?? "Could not save the project")
      : uploading
        ? "Wait for uploads to finish before saving"
        : "Save project (Ctrl/Cmd+S)";

  const tone = failed || conflict
    ? "is-error"
    : saving || uploading
      ? "is-saving"
      : dirty
        ? "is-warn"
        : "is-saved";

  return (
    <div className="flex items-center gap-2.5">
      {conflict ? (
        <ConflictMenu title={title} />
      ) : (
        <span
          className={`editor-header-save-status ${tone}`}
          title={failed ? title : statusLabel}
          aria-label={statusLabel}
          role="status"
        >
          <span className="editor-header-save-dot" />
          <span className="editor-header-save-text">{statusLabel}</span>
        </span>
      )}
      <EditorButton
        variant="outline"
        className={`editor-header-btn${canSave ? " is-attention" : ""}`}
        title={title}
        disabled={!canSave}
        onClick={() => void saveProject()}
      >
        {saving || uploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Save className="h-3.5 w-3.5" />
        )}
        <span className="editor-header-btn-label">Save</span>
      </EditorButton>
    </div>
  );
}

/**
 * A save conflict used to offer only Reload, which drops this editor's work.
 * The author can now keep a copy, overwrite the other save, or reload.
 */
function ConflictMenu({ title }: { title: string }) {
  const projectId = useProjectPersistStore((s) => s.projectId);

  const overwrite = async () => {
    const ok = await confirmDelete({
      subject: "changes",
      title: "Overwrite the other save?",
      description:
        "Someone (or another tab) saved this project after you opened it. Saving now replaces their version with yours, including scenes they added. Download a copy first if unsure.",
      confirmLabel: "Overwrite",
      cancelLabel: "Cancel",
    });
    if (ok) await overwriteSavedProject();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="editor-header-save-status is-error is-action"
          title={title}
          aria-label="Resolve save conflict"
        >
          <span className="editor-header-save-dot" />
          <span className="editor-header-save-text">Saved elsewhere</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="editor-dropdown-menu">
        <DropdownMenuItem
          className="editor-dropdown-menu-item"
          onSelect={() => {
            if (downloadProjectBackup(projectId)) {
              toast.success("Your version was downloaded");
            } else {
              toast.error("Could not create the download");
            }
          }}
        >
          <Download className="h-3.5 w-3.5" />
          Download my version
        </DropdownMenuItem>
        <DropdownMenuItem
          className="editor-dropdown-menu-item"
          onSelect={() => void overwrite()}
        >
          <Upload className="h-3.5 w-3.5" />
          Keep mine (overwrite)
        </DropdownMenuItem>
        <DropdownMenuItem
          className="editor-dropdown-menu-item editor-dropdown-menu-item-danger"
          variant="destructive"
          onSelect={() => window.location.reload()}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Reload latest (discard mine)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
