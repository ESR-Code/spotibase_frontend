"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { PanelRightOpen } from "lucide-react";
import { ActionNodeCard } from "@/app/editor/_components/actions/action-node-card";
import { useActionsEditor } from "@/app/editor/_components/actions/actions-editor-context";
import type { ActionFlowNodeData } from "@/lib/editor/actions/flow-adapter";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import {
  OPEN_MODAL_HANDLE_ON_CLOSE,
  OPEN_MODAL_HANDLE_ON_OPEN,
} from "@/lib/editor/types/hotspot-action";

export type OpenModalFlowNode = Node<ActionFlowNodeData, "openModal">;

export function OpenModalNode({
  data,
  selected,
}: NodeProps<OpenModalFlowNode>) {
  const { deleteNode } = useActionsEditor();
  const hotspot = useEditorStore((s) =>
    s.hotspots.find((h) => h.id === data.hotspotId),
  );
  const actionNode = data.actionNode;
  if (!actionNode) return null;

  const blockCount = hotspot?.blocks.length ?? 0;

  return (
    <ActionNodeCard
      label="Open Modal"
      icon={PanelRightOpen}
      accent="var(--editor-crimson-2)"
      selected={selected}
      showSource={false}
      onDelete={() => deleteNode(data.hotspotId, actionNode.id)}
    >
      <div className="text-[11px]" style={{ color: "var(--editor-muted)" }}>
        {blockCount === 0
          ? "Hotspot has no content blocks yet."
          : `Opens marker dialog (${blockCount} block${blockCount === 1 ? "" : "s"}).`}
      </div>

      <div className="editor-action-event-handles" aria-hidden>
        <div className="editor-action-event-handle-row">
          <span className="editor-action-event-handle-label">onOpen</span>
          <Handle
            id={OPEN_MODAL_HANDLE_ON_OPEN}
            type="source"
            position={Position.Right}
            className="editor-action-handle editor-action-handle-event"
          />
        </div>
        <div className="editor-action-event-handle-row">
          <span className="editor-action-event-handle-label">onClose</span>
          <Handle
            id={OPEN_MODAL_HANDLE_ON_CLOSE}
            type="source"
            position={Position.Right}
            className="editor-action-handle editor-action-handle-event"
          />
        </div>
      </div>
    </ActionNodeCard>
  );
}
