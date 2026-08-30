"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { MapPin } from "lucide-react";
import { ActionNodeCard } from "@/app/editor/_components/actions/action-node-card";
import { useActionsEditor } from "@/app/editor/_components/actions/actions-editor-context";
import { getOwnedActionGraph } from "@/lib/editor/actions/action-owners";
import type { ActionFlowNodeData } from "@/lib/editor/actions/flow-adapter";
import {
  countForEachSampleItems,
  findUpstreamForEach,
} from "@/lib/editor/actions/for-each";
import { validateSpawnHotspotsData } from "@/lib/editor/actions/spawn-hotspots";
import { useOwnedActionNode } from "@/lib/editor/actions/use-owned-action-node";
import { useUIStore } from "@/lib/editor/state/ui-store";
import {
  SPAWN_COORD_MODES,
  type SpawnCoordMode,
} from "@/lib/editor/types/hotspot-action";

export type SpawnHotspotsFlowNode = Node<ActionFlowNodeData, "spawnHotspots">;

export function SpawnHotspotsNode({
  data,
  selected,
}: NodeProps<SpawnHotspotsFlowNode>) {
  const { deleteNode, updateNodeData } = useActionsEditor();
  const actionNodeId = data.actionNode?.id;
  const ownerId = data.hotspotId;
  const ownedNode = useOwnedActionNode(ownerId, actionNodeId);
  const openSpawnTemplateEditor = useUIStore((s) => s.openSpawnTemplateEditor);

  if (!actionNodeId) return null;

  const coordMode =
    ownedNode?.type === "spawnHotspots" ? ownedNode.data.coordMode : "auto";
  const warning =
    ownedNode?.type === "spawnHotspots"
      ? validateSpawnHotspotsData(ownedNode)
      : "Place this node after For Each";

  const graph = getOwnedActionGraph(ownerId);
  const forEachNode =
    graph && ownedNode ? findUpstreamForEach(graph, ownedNode.id) : null;
  const sampleCount =
    graph && forEachNode
      ? countForEachSampleItems(graph, forEachNode)
      : null;

  return (
    <ActionNodeCard
      label="Spawn Hotspot"
      icon={MapPin}
      accent="#e07a5f"
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
        ) : sampleCount != null ? (
          <div className="text-[10px]" style={{ color: "var(--editor-muted)" }}>
            Will spawn {sampleCount}
          </div>
        ) : null
      }
    >
      <label className="block">
        <span
          className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--editor-muted-2)" }}
        >
          Coordinates
        </span>
        <select
          className="editor-input nodrag nopan nowheel"
          value={coordMode}
          onChange={(e) => {
            e.stopPropagation();
            updateNodeData(ownerId, actionNodeId, {
              coordMode: e.target.value as SpawnCoordMode,
            });
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {SPAWN_COORD_MODES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="editor-btn editor-btn-ghost mt-2 w-full justify-center text-[11px] nodrag nopan"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          openSpawnTemplateEditor(ownerId, actionNodeId);
        }}
      >
        Configure template
      </button>
    </ActionNodeCard>
  );
}
