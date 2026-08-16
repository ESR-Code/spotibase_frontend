"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { Crosshair } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { ActionNodeCard } from "@/app/editor/_components/actions/action-node-card";
import { useActionsEditor } from "@/app/editor/_components/actions/actions-editor-context";
import { SwitchField } from "@/app/editor/_components/ui/switch-field";
import { TypePill } from "@/app/editor/_components/ui/type-pill";
import {
  APP_START_OWNER_ID,
  isHotspotOwnerId,
} from "@/lib/editor/actions/action-owners";
import { resolveGoToHotspotId } from "@/lib/editor/actions/go-to-hotspot";
import type { ActionFlowNodeData } from "@/lib/editor/actions/flow-adapter";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import {
  GO_TO_HOTSPOT_OFFSETS,
  type GoToHotspotActionNode,
  type GoToHotspotOffset,
} from "@/lib/editor/types/hotspot-action";

export type GoToHotspotFlowNode = Node<ActionFlowNodeData, "goToHotspot">;

const EMPTY_DATA: GoToHotspotActionNode["data"] = {
  hotspotId: 0,
  offset: "self",
  runTargetActions: false,
};

export function GoToHotspotNode({
  data,
  selected,
}: NodeProps<GoToHotspotFlowNode>) {
  const { deleteNode, updateNodeData } = useActionsEditor();
  const actionNodeId = data.actionNode?.id;
  const ownerId = data.hotspotId;
  const hotspots = useEditorStore((s) => s.hotspots);

  const hotspotLive = useEditorStore(
    useShallow((s) => {
      if (!actionNodeId || !isHotspotOwnerId(ownerId)) return EMPTY_DATA;
      const hotspot = s.hotspots.find((h) => h.id === ownerId);
      const node = hotspot?.actions?.nodes.find((n) => n.id === actionNodeId);
      if (!node || node.type !== "goToHotspot") return EMPTY_DATA;
      return {
        hotspotId: node.data.hotspotId ?? 0,
        offset: node.data.offset ?? "self",
        runTargetActions: Boolean(node.data.runTargetActions),
      };
    }),
  );

  const startLive = useScenesStore(
    useShallow((s) => {
      if (!actionNodeId || isHotspotOwnerId(ownerId)) return EMPTY_DATA;
      const graph =
        ownerId === APP_START_OWNER_ID
          ? s.appStartActions
          : (s.scenes.find((sc) => sc.id === s.activeSceneId)?.startActions ??
            null);
      const node = graph?.nodes.find((n) => n.id === actionNodeId);
      if (!node || node.type !== "goToHotspot") return EMPTY_DATA;
      return {
        hotspotId: node.data.hotspotId ?? 0,
        offset: node.data.offset ?? "self",
        runTargetActions: Boolean(node.data.runTargetActions),
      };
    }),
  );

  const live = isHotspotOwnerId(ownerId) ? hotspotLive : startLive;

  if (!actionNodeId) return null;

  const exists =
    !live.hotspotId || hotspots.some((hotspot) => hotspot.id === live.hotspotId);
  const resolvedId =
    live.hotspotId && exists
      ? resolveGoToHotspotId(live.hotspotId, live.offset)
      : null;
  const resolved = resolvedId
    ? hotspots.find((hotspot) => hotspot.id === resolvedId)
    : null;

  const warning = !live.hotspotId
    ? "Select a target hotspot"
    : !exists
      ? "Target hotspot no longer exists"
      : null;

  const patch = (partial: Partial<GoToHotspotActionNode["data"]>) => {
    updateNodeData(ownerId, actionNodeId, partial);
  };

  const setOffset = (offset: GoToHotspotOffset) => {
    if (offset !== "self" && live.offset === offset) {
      patch({ offset: "self" });
      return;
    }
    patch({ offset });
  };

  return (
    <ActionNodeCard
      label="Go To Hotspot"
      icon={Crosshair}
      accent="#f0a35a"
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
        ) : resolved ? (
          <div
            className="truncate text-[10px] font-medium"
            style={{ color: "var(--editor-muted)" }}
          >
            → {resolved.title || `Hotspot ${resolved.id}`}
            {live.runTargetActions ? " + actions" : ""}
          </div>
        ) : null
      }
    >
      <label className="mb-2 block">
        <span
          className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--editor-muted-2)" }}
        >
          Target hotspot
        </span>
        <select
          className="editor-select"
          value={live.hotspotId || ""}
          onChange={(e) => {
            e.stopPropagation();
            patch({
              hotspotId: e.target.value ? Number(e.target.value) : 0,
            });
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <option value="">Select hotspot…</option>
          {hotspots.map((hotspot) => (
            <option key={hotspot.id} value={hotspot.id}>
              {hotspot.title || `Hotspot ${hotspot.id}`} (HSP-
              {String(hotspot.id).padStart(3, "0")})
            </option>
          ))}
        </select>
      </label>

      <div className="mb-2">
        <span
          className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--editor-muted-2)" }}
        >
          Offset
        </span>
        <div className="editor-pill-row nodrag nopan">
          {GO_TO_HOTSPOT_OFFSETS.map((option) => (
            <TypePill
              key={option.value}
              active={live.offset === option.value}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setOffset(option.value);
              }}
            >
              {option.label}
            </TypePill>
          ))}
        </div>
      </div>

      <div
        className="nodrag nopan"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <SwitchField
          label="Run target actions"
          description="After focusing, fire the destination hotspot's action chain"
          checked={live.runTargetActions}
          onChange={(checked) => patch({ runTargetActions: checked })}
        />
      </div>
    </ActionNodeCard>
  );
}
