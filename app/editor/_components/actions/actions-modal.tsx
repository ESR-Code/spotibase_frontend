"use client";

import { Frame, Workflow, X } from "lucide-react";
import { ActionsFlow } from "@/app/editor/_components/actions/actions-flow";
import { EditorChip } from "@/app/editor/_components/ui/editor-chip";
import { EditorDialog } from "@/app/editor/_components/ui/editor-dialog";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useActionFencesStore } from "@/lib/editor/state/action-fences-store";
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
      ? "Define what happens when this hotspot is clicked, and wire any Action buttons in its content."
      : `App Start, Scene Start, menu buttons, hotspot clicks, and Action buttons for “${activeScene.name}”. Use “Add action”, double-click or right-click the canvas to add nodes.`;

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
      className="editor-actions-dialog"
    >
      <EditorDialog.Header
        className="editor-actions-header"
        title={title}
        description={<span title={description}>{description}</span>}
        leading={
          <span className="editor-actions-header-badge" aria-hidden>
            <Workflow />
          </span>
        }
      >
        <div className="editor-actions-header-scope">{chip}</div>
        <div className="editor-actions-header-tools">
          <button
            type="button"
            className="editor-actions-fence-btn"
            title="Add a fence. Selected nodes are grouped inside it."
            onClick={() =>
              useActionFencesStore.getState().requestCreateFence()
            }
          >
            <Frame />
            Fence
          </button>
          <div className="editor-vsep" />
          <IconButton title="Close (Esc)" aria-label="Close" onClick={closeActionsModal}>
            <X />
          </IconButton>
        </div>
      </EditorDialog.Header>

      <EditorDialog.Body className="editor-actions-dialog-body !p-0">
        <ActionsFlow
          hotspots={scopedHotspots}
          includeStartGraphs={scope.kind === "scene"}
          focusOwnerId={scope.kind === "hotspot" ? scope.focusOwnerId : undefined}
        />
      </EditorDialog.Body>
    </EditorDialog>
  );
}
