"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { XCircle } from "lucide-react";
import { ActionNodeCard } from "@/app/editor/_components/actions/action-node-card";
import { useActionsEditor } from "@/app/editor/_components/actions/actions-editor-context";
import type { ActionFlowNodeData } from "@/lib/editor/actions/flow-adapter";

export type CloseDialogFlowNode = Node<ActionFlowNodeData, "closeDialog">;

export function CloseDialogNode({
  data,
  selected,
}: NodeProps<CloseDialogFlowNode>) {
  const { deleteNode } = useActionsEditor();
  const actionNodeId = data.actionNode?.id;

  if (!actionNodeId) return null;

  return (
    <ActionNodeCard
      label="Close Dialog"
      icon={XCircle}
      accent="var(--editor-teal)"
      selected={selected}
      onDelete={() => deleteNode(data.hotspotId, actionNodeId)}
      footer={
        <div
          className="text-[10px] font-medium"
          style={{ color: "var(--editor-muted)" }}
        >
          Closes the open dialog, then continues
        </div>
      }
    />
  );
}
