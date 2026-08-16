"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { Palette, RotateCcw } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { ActionNodeCard } from "@/app/editor/_components/actions/action-node-card";
import { useActionsEditor } from "@/app/editor/_components/actions/actions-editor-context";
import { HotspotTargetsPanel } from "@/app/editor/_components/actions/hotspot-targets-panel";
import { ColorSwatch } from "@/app/editor/_components/ui/color-swatch";
import { FieldLabel } from "@/app/editor/_components/ui/field-label";
import {
  APP_START_OWNER_ID,
  isHotspotOwnerId,
} from "@/lib/editor/actions/action-owners";
import type { ActionFlowNodeData } from "@/lib/editor/actions/flow-adapter";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import { markerColorSwatches } from "@/lib/editor/theme/tokens";
import type { ChangeHotspotColorActionNode } from "@/lib/editor/types/hotspot-action";

export type ChangeHotspotColorFlowNode = Node<
  ActionFlowNodeData,
  "changeHotspotColor"
>;

const EMPTY_DATA: ChangeHotspotColorActionNode["data"] = {
  hotspotIds: [],
  color: markerColorSwatches[0],
};

export function ChangeHotspotColorNode({
  data,
  selected,
}: NodeProps<ChangeHotspotColorFlowNode>) {
  const { deleteNode, updateNodeData } = useActionsEditor();
  const actionNodeId = data.actionNode?.id;
  const ownerId = data.hotspotId;
  const hotspots = useEditorStore((s) => s.hotspots);

  const hotspotLive = useEditorStore(
    useShallow((s) => {
      if (!actionNodeId || !isHotspotOwnerId(ownerId)) return EMPTY_DATA;
      const hotspot = s.hotspots.find((h) => h.id === ownerId);
      const node = hotspot?.actions?.nodes.find((n) => n.id === actionNodeId);
      if (!node || node.type !== "changeHotspotColor") return EMPTY_DATA;
      return {
        hotspotIds: node.data.hotspotIds ?? [],
        color: node.data.color ?? "",
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
      if (!node || node.type !== "changeHotspotColor") return EMPTY_DATA;
      return {
        hotspotIds: node.data.hotspotIds ?? [],
        color: node.data.color ?? "",
      };
    }),
  );

  const live = isHotspotOwnerId(ownerId) ? hotspotLive : startLive;

  if (!actionNodeId) return null;

  const options = hotspots.map((hotspot) => ({
    id: hotspot.id,
    label: hotspot.title || `Hotspot ${hotspot.id}`,
    chip: `HSP-${String(hotspot.id).padStart(3, "0")}`,
  }));
  const selectedCount = live.hotspotIds.filter((id) =>
    options.some((option) => option.id === id),
  ).length;
  const isCustomColor =
    live.color !== "" &&
    !markerColorSwatches.includes(
      live.color as (typeof markerColorSwatches)[number],
    );
  const isReset = live.color.trim() === "";

  const patch = (partial: Partial<ChangeHotspotColorActionNode["data"]>) => {
    updateNodeData(ownerId, actionNodeId, partial);
  };

  return (
    <ActionNodeCard
      label="Change Hotspot Color"
      icon={Palette}
      accent="#ff7a59"
      selected={selected}
      wide
      onDelete={() => deleteNode(ownerId, actionNodeId)}
      footer={
        <div
          className="text-[10px] font-medium"
          style={{ color: "var(--editor-muted)" }}
        >
          {selectedCount === 0
            ? "No hotspots selected"
            : isReset
              ? `Reset ${selectedCount} to original`
              : `Recolor ${selectedCount}`}
        </div>
      }
    >
      <HotspotTargetsPanel
        options={options}
        selectedIds={live.hotspotIds}
        onChange={(hotspotIds) => patch({ hotspotIds })}
      >
        <div className="nodrag nopan nowheel space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <FieldLabel>Color</FieldLabel>
            <button
              type="button"
              className="editor-enable-disable-group-all inline-flex items-center gap-1"
              title="Restore original hotspot colors when this node runs"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                patch({ color: "" });
              }}
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          </div>
          <div className="editor-swatch-row">
            {markerColorSwatches.map((color) => (
              <ColorSwatch
                key={color}
                color={color}
                selected={live.color === color}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  patch({ color });
                }}
              />
            ))}
            <label
              className={`editor-swatch editor-swatch-custom ${isCustomColor ? "selected" : ""}`}
              title="Custom color"
              style={isCustomColor ? { background: live.color } : undefined}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="color"
                aria-label="Custom color"
                value={
                  /^#[0-9a-fA-F]{6}$/.test(live.color)
                    ? live.color
                    : "#e63946"
                }
                onChange={(e) => patch({ color: e.target.value })}
              />
            </label>
          </div>
          {isReset ? (
            <p
              className="text-[10px] leading-snug"
              style={{ color: "var(--editor-muted)" }}
            >
              Will restore each target&apos;s original color
            </p>
          ) : null}
        </div>
      </HotspotTargetsPanel>
    </ActionNodeCard>
  );
}
