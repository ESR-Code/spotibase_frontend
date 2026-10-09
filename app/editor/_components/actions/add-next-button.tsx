"use client";

import { useNodeConnections, useNodeId } from "@xyflow/react";
import { Plus } from "lucide-react";
import { useActionsEditor } from "@/app/editor/_components/actions/actions-editor-context";
import { parseFlowNodeId } from "@/lib/editor/actions/flow-adapter";

/**
 * "+" beside a node's default output while nothing is connected to it.
 * Opens the add-node menu and wires the new node to this node.
 * Render only where the node has a single, default source handle.
 */
export function AddNextButton() {
  const flowId = useNodeId();
  const connections = useNodeConnections({ handleType: "source" });
  const { openAddMenu } = useActionsEditor();
  const parsed = flowId ? parseFlowNodeId(flowId) : null;

  if (!parsed || connections.length > 0) return null;

  return (
    <button
      type="button"
      className="editor-action-add-next nodrag nopan"
      title="Add next action"
      aria-label="Add next action"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        openAddMenu(
          parsed.hotspotId,
          { clientX: rect.right, clientY: rect.top + rect.height / 2 },
          { nodeId: parsed.nodeId, handleId: null, handleType: "source" },
        );
      }}
    >
      <Plus />
    </button>
  );
}
