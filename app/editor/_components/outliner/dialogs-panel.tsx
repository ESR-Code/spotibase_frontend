"use client";

import { Copy, MessageSquare, Plus, Trash2 } from "lucide-react";
import { toast } from "@/lib/editor/toast";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import {
  addSceneDialog,
  duplicateSceneDialog,
  removeSceneDialog,
  useActiveSceneDialogs,
} from "@/lib/editor/dialogs/scene-dialogs";
import {
  clearEditorSelection,
  selectDialogExclusive,
} from "@/lib/editor/state/exclusive-selection";
import { useUIStore } from "@/lib/editor/state/ui-store";
import type { SceneDialog } from "@/lib/editor/types/scene-dialog";

/** Outliner Dialogs tab: standalone dialogs of the active scene. */
export function DialogsPanel() {
  const dialogs = useActiveSceneDialogs();
  const editingId = useUIStore((s) => s.dialogEditorId);

  const handleAdd = () => {
    const dialog = addSceneDialog();
    selectDialogExclusive(dialog.id);
  };

  return (
    <>
      <div className="flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
        {dialogs.length === 0 ? (
          <div className="editor-empty-state">
            <MessageSquare
              className="mx-auto mb-2 h-8 w-8"
              style={{ color: "var(--editor-line)" }}
            />
            <div className="mb-1 text-[12px] font-semibold">No dialogs yet</div>
            <div className="text-[11px]">
              Dialogs show content without a hotspot: a welcome on Scene Start,
              or help behind a menu button. Open them with an Open Modal node.
            </div>
          </div>
        ) : (
          dialogs.map((dialog) => (
            <DialogListItem
              key={dialog.id}
              dialog={dialog}
              selected={editingId === dialog.id}
              onSelect={() => selectDialogExclusive(dialog.id)}
              onDuplicate={() => {
                const copy = duplicateSceneDialog(dialog.id);
                if (copy) {
                  selectDialogExclusive(copy.id);
                  toast.success("Dialog duplicated");
                }
              }}
              onDelete={() => {
                if (editingId === dialog.id) clearEditorSelection();
                removeSceneDialog(dialog.id);
              }}
            />
          ))
        )}
      </div>
      <div
        className="flex-shrink-0 p-3"
        style={{ borderTop: "1px solid var(--editor-line-soft)" }}
      >
        <EditorButton className="w-full justify-center" onClick={handleAdd}>
          <Plus className="h-3.5 w-3.5" />
          Add dialog
        </EditorButton>
      </div>
    </>
  );
}

type DialogListItemProps = {
  dialog: SceneDialog;
  selected: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

function DialogListItem({
  dialog,
  selected,
  onSelect,
  onDuplicate,
  onDelete,
}: DialogListItemProps) {
  const count = dialog.blocks.length;
  return (
    <div
      className={`editor-hot-item ${selected ? "selected" : ""}`}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      role="button"
      tabIndex={0}
    >
      <span
        className="editor-hot-dot"
        style={{ background: "var(--editor-line)", color: "var(--editor-fg)" }}
      >
        <span className="editor-marker-shape-content">
          <MessageSquare className="h-3 w-3" />
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12.5px] font-semibold">
          {dialog.title.trim() || "Untitled dialog"}
        </div>
        <div
          className="text-[10.5px] uppercase tracking-wider"
          style={{ color: "var(--editor-muted-2)" }}
        >
          {count} block{count === 1 ? "" : "s"}
        </div>
      </div>
      <button
        type="button"
        className="editor-btn-ghost rounded p-1"
        title="Duplicate dialog"
        onClick={(e) => {
          e.stopPropagation();
          onDuplicate();
        }}
      >
        <Copy className="h-3 w-3" />
      </button>
      <button
        type="button"
        className="editor-btn-ghost rounded p-1"
        title="Delete dialog"
        style={{ color: "var(--editor-crimson-2)" }}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}
