"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { MapPinned } from "lucide-react";
import { ActionNodeCard } from "@/app/editor/_components/actions/action-node-card";
import { useActionsEditor } from "@/app/editor/_components/actions/actions-editor-context";
import type { ActionFlowNodeData } from "@/lib/editor/actions/flow-adapter";
import { useScenesStore } from "@/lib/editor/state/scenes-store";

export type GoToSceneFlowNode = Node<ActionFlowNodeData, "goToScene">;

export function GoToSceneNode({
  data,
  selected,
}: NodeProps<GoToSceneFlowNode>) {
  const { deleteNode, updateNodeData } = useActionsEditor();
  const scenes = useScenesStore((s) => s.scenes);
  const actionNode = data.actionNode;
  if (!actionNode || actionNode.type !== "goToScene") return null;

  const sceneId = actionNode.data.sceneId;
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
      onDelete={() => deleteNode(data.hotspotId, actionNode.id)}
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
            updateNodeData(data.hotspotId, actionNode.id, {
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
