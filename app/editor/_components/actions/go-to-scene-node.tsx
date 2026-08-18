"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { MapPinned } from "lucide-react";
import { ActionNodeCard } from "@/app/editor/_components/actions/action-node-card";
import { useActionsEditor } from "@/app/editor/_components/actions/actions-editor-context";
import { useOwnedActionNode } from "@/lib/editor/actions/use-owned-action-node";
import type { ActionFlowNodeData } from "@/lib/editor/actions/flow-adapter";
import { useScenesStore } from "@/lib/editor/state/scenes-store";

export type GoToSceneFlowNode = Node<ActionFlowNodeData, "goToScene">;

export function GoToSceneNode({
  data,
  selected,
}: NodeProps<GoToSceneFlowNode>) {
  const { deleteNode, updateNodeData } = useActionsEditor();
  const scenes = useScenesStore((s) => s.scenes);
  const actionNodeId = data.actionNode?.id;
  const ownerId = data.hotspotId;
  const node = useOwnedActionNode(ownerId, actionNodeId);
  const sceneId = node?.type === "goToScene" ? node.data.sceneId : "";

  if (!actionNodeId) return null;
  const exists = !sceneId || scenes.some((s) => s.id === sceneId);
  const warning = !sceneId
    ? "Select a target scene"
    : !exists
      ? "Target scene no longer exists"
      : null;

  return (
    <ActionNodeCard
      label="Go To Scene"
      icon={MapPinned}
      accent="var(--editor-amber)"
      selected={selected}
      onDelete={() => deleteNode(ownerId, actionNodeId)}
      footer={
        warning ? (
          <div
            className="text-[10px] font-medium"
            style={{ color: "var(--editor-amber)" }}
          >
            {warning}
          </div>
        ) : null
      }
    >
      <label className="block">
        <span
          className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--editor-muted-2)" }}
        >
          Scene
        </span>
        <select
          className="editor-select"
          value={sceneId}
          onChange={(e) => {
            e.stopPropagation();
            updateNodeData(ownerId, actionNodeId, {
              sceneId: e.target.value,
            });
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <option value="">Select scene…</option>
          {scenes.map((scene) => (
            <option key={scene.id} value={scene.id}>
              {scene.name}
              {scene.isPrimary ? " (Primary)" : ""}
            </option>
          ))}
        </select>
      </label>
    </ActionNodeCard>
  );
}
