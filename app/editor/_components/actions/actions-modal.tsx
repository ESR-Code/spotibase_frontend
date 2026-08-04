"use client";

import { Workflow, X } from "lucide-react";
import { ActionsFlow } from "@/app/editor/_components/actions/actions-flow";
import { EditorChip } from "@/app/editor/_components/ui/editor-chip";
import { EditorDialog } from "@/app/editor/_components/ui/editor-dialog";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useActiveScene } from "@/lib/editor/state/scenes-store";
import { useUIStore } from "@/lib/editor/state/ui-store";

export function ActionsModal() {
  const isPreview = useEditorStore((s) => s.isPreview);
  const scope = useUIStore((s) => s.actionsModal);
  const closeActionsModal = useUIStore((s) => s.closeActionsModal);
  const hotspots = useEditorStore((s) => s.hotspots);
  const activeScene = useActiveScene();

  if (isPreview || !scope) return null;

  const scopedHotspots =
    scope.kind === "hotspot"
      ? hotspots.filter((h) => h.id === scope.hotspotId)
      : hotspots;

  const title =
    scope.kind === "hotspot" ? "Hotspot Actions" : "Scene Actions";
  const description =
    scope.kind === "hotspot"
      ? "Define what happens when this hotspot is clicked."
      : `All action chains in “${activeScene.name}”. Right-click the canvas to add nodes.`;

  const chip =
    scope.kind === "hotspot" ? (
      <EditorChip>
        HSP-{String(scope.hotspotId).padStart(3, "0")}
      </EditorChip>
    ) : (
      <EditorChip
        style={{
          color: "var(--editor-teal)",
          borderColor: "rgba(63,184,175,0.3)",
        }}
      >
        {activeScene.name}
      </EditorChip>
    );

  return (
    <EditorDialog
      open
      onClose={closeActionsModal}
      presentation="modal"
      size="fullscreen"
      backdrop
      backdropBlur
      className="editor-actions-dialog"
    >
      <EditorDialog.Header title={title} description={description}>
        <div className="flex items-center gap-2">
          <span
            className="hidden items-center gap-1.5 text-[11px] font-semibold sm:inline-flex"
            style={{ color: "var(--editor-muted)" }}
          >
            <Workflow className="h-3.5 w-3.5" />
            Actions
          </span>
          {chip}
          <IconButton title="Close" onClick={closeActionsModal}>
            <X />
          </IconButton>
        </div>
      </EditorDialog.Header>

      <EditorDialog.Body className="editor-actions-dialog-body !p-0">
        <ActionsFlow hotspots={scopedHotspots} />
      </EditorDialog.Body>
    </EditorDialog>
  );
}
