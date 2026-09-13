"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { Timer } from "lucide-react";
import { ActionNodeCard } from "@/app/editor/_components/actions/action-node-card";
import { useActionsEditor } from "@/app/editor/_components/actions/actions-editor-context";
import type { ActionFlowNodeData } from "@/lib/editor/actions/flow-adapter";
import { useOwnedActionNode } from "@/lib/editor/actions/use-owned-action-node";
import {
  clampWaitDurationSeconds,
  WAIT_DURATION_DEFAULT_SECONDS,
  WAIT_DURATION_MAX_SECONDS,
  WAIT_DURATION_MIN_SECONDS,
  type WaitActionNode,
} from "@/lib/editor/types/hotspot-action";

export type WaitFlowNode = Node<ActionFlowNodeData, "wait">;

function formatWaitDuration(seconds: number): string {
  const rounded = Math.round(seconds * 100) / 100;
  return `${String(rounded)}s`;
}

export function WaitNode({ data, selected }: NodeProps<WaitFlowNode>) {
  const { deleteNode, updateNodeData } = useActionsEditor();
  const actionNodeId = data.actionNode?.id;
  const ownerId = data.hotspotId;
  const node = useOwnedActionNode(ownerId, actionNodeId);
  const durationSeconds =
    node?.type === "wait"
      ? clampWaitDurationSeconds(node.data.durationSeconds)
      : WAIT_DURATION_DEFAULT_SECONDS;

  if (!actionNodeId) return null;

  const patch = (partial: Partial<WaitActionNode["data"]>) => {
    updateNodeData(ownerId, actionNodeId, partial);
  };

  return (
    <ActionNodeCard
      label="Wait"
      icon={Timer}
      accent="#818cf8"
      selected={selected}
      onDelete={() => deleteNode(ownerId, actionNodeId)}
      footer={
        <div
          className="text-[10px] font-medium"
          style={{ color: "var(--editor-muted)" }}
        >
          {formatWaitDuration(durationSeconds)} then continue
        </div>
      }
    >
      <label className="block">
        <span
          className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--editor-muted-2)" }}
        >
          Duration (s)
        </span>
        <input
          className="editor-input nodrag nopan nowheel"
          type="number"
          min={WAIT_DURATION_MIN_SECONDS}
          max={WAIT_DURATION_MAX_SECONDS}
          step={0.1}
          value={durationSeconds}
          aria-label="Wait duration in seconds"
          onChange={(e) => {
            e.stopPropagation();
            patch({
              durationSeconds: clampWaitDurationSeconds(e.target.value),
            });
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        />
      </label>
    </ActionNodeCard>
  );
}
