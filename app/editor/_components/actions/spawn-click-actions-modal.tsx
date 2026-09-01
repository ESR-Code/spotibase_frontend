"use client";

import { Workflow, X } from "lucide-react";
import { ActionsFlow } from "@/app/editor/_components/actions/actions-flow";
import { EditorChip } from "@/app/editor/_components/ui/editor-chip";
import { EditorDialog } from "@/app/editor/_components/ui/editor-dialog";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import {
  getOwnedActionGraph,
  setOwnedActionGraph,
} from "@/lib/editor/actions/action-owners";
import { createDefaultActionGraph } from "@/lib/editor/actions/create-action-graph";
import { updateNodeData } from "@/lib/editor/actions/graph-ops";
import { useOwnedActionNode } from "@/lib/editor/actions/use-owned-action-node";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useUIStore } from "@/lib/editor/state/ui-store";

export function SpawnClickActionsModal() {
  const isPreview = useEditorStore((s) => s.isPreview);
  const editor = useUIStore((s) => s.spawnClickActionsEditor);
  const close = useUIStore((s) => s.closeSpawnClickActionsEditor);
  const ownedNode = useOwnedActionNode(editor?.ownerId ?? 0, editor?.nodeId);

  if (isPreview || !editor || ownedNode?.type !== "spawnHotspots") return null;

  const template = ownedNode.data.template;
  const graph = template.actions ?? createDefaultActionGraph();

  return (
    <EditorDialog
      open
      onClose={close}
      presentation="modal"
      size="fullscreen"
      backdrop
      backdropBlur
      className="editor-actions-dialog"
    >
      <EditorDialog.Header
        title="Spawn click actions"
        description="Define what happens when a pin from this Spawn node is clicked."
      >
        <div className="flex items-center gap-2">
          <span
            className="hidden items-center gap-1.5 text-[11px] font-semibold sm:inline-flex"
            style={{ color: "var(--editor-muted)" }}
          >
            <Workflow className="h-3.5 w-3.5" />
            Actions
          </span>
          <EditorChip>Click</EditorChip>
          <IconButton title="Close" onClick={close}>
            <X />
          </IconButton>
        </div>
      </EditorDialog.Header>

      <EditorDialog.Body className="editor-actions-dialog-body !p-0">
        <ActionsFlow
          hotspots={[]}
          includeStartGraphs={false}
          isolatedLane={{
            title: "When this pin is clicked",
            graph,
            onChange: (next) => {
              const current = getOwnedActionGraph(editor.ownerId);
              if (!current) return;
              setOwnedActionGraph(
                editor.ownerId,
                updateNodeData(current, editor.nodeId, {
                  template: { ...template, actions: next },
                }),
              );
            },
            fenceScopeKey: `spawnClick:${editor.ownerId}:${editor.nodeId}`,
          }}
        />
      </EditorDialog.Body>
    </EditorDialog>
  );
}
