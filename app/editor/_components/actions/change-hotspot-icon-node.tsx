"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { Shapes, RotateCcw } from "lucide-react";
import { ActionNodeCard } from "@/app/editor/_components/actions/action-node-card";
import { useActionsEditor } from "@/app/editor/_components/actions/actions-editor-context";
import { HotspotTargetsPanel } from "@/app/editor/_components/actions/hotspot-targets-panel";
import { CategoryIconPicker } from "@/app/editor/_components/ui/category-icon-picker";
import { FieldLabel } from "@/app/editor/_components/ui/field-label";
import type { ActionFlowNodeData } from "@/lib/editor/actions/flow-adapter";
import { useOwnedActionNode } from "@/lib/editor/actions/use-owned-action-node";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import type { ChangeHotspotIconActionNode } from "@/lib/editor/types/hotspot-action";

export type ChangeHotspotIconFlowNode = Node<
  ActionFlowNodeData,
  "changeHotspotIcon"
>;

const EMPTY_DATA: ChangeHotspotIconActionNode["data"] = {
  hotspotIds: [],
  icon: "Info",
};

export function ChangeHotspotIconNode({
  data,
  selected,
}: NodeProps<ChangeHotspotIconFlowNode>) {
  const { deleteNode, updateNodeData } = useActionsEditor();
  const actionNodeId = data.actionNode?.id;
  const ownerId = data.hotspotId;
  const hotspots = useEditorStore((s) => s.hotspots);
  const ownedNode = useOwnedActionNode(ownerId, actionNodeId);
  const live =
    ownedNode?.type === "changeHotspotIcon"
      ? {
          hotspotIds: ownedNode.data.hotspotIds ?? [],
          icon: ownedNode.data.icon ?? "",
        }
      : EMPTY_DATA;

  if (!actionNodeId) return null;

  const options = hotspots.map((hotspot) => ({
    id: hotspot.id,
    label: hotspot.title || `Hotspot ${hotspot.id}`,
    chip: `HSP-${String(hotspot.id).padStart(3, "0")}`,
  }));
  const selectedCount = live.hotspotIds.filter((id) =>
    options.some((option) => option.id === id),
  ).length;
  const isReset = live.icon.trim() === "";
  const previewColor =
    hotspots.find((h) => live.hotspotIds.includes(h.id))?.color ?? "#3fb8af";

  const patch = (partial: Partial<ChangeHotspotIconActionNode["data"]>) => {
    updateNodeData(ownerId, actionNodeId, partial);
  };

  return (
    <ActionNodeCard
      label="Change Hotspot Icon"
      icon={Shapes}
      accent="#6ec6ff"
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
              : `Change icon on ${selectedCount}`}
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
            <FieldLabel>Icon</FieldLabel>
            <button
              type="button"
              className="editor-enable-disable-group-all inline-flex items-center gap-1"
              title="Restore original hotspot icons when this node runs"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                patch({ icon: "" });
              }}
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          </div>
          <CategoryIconPicker
            value={live.icon || "Info"}
            color={previewColor}
            onChange={(icon) => patch({ icon })}
          />
          {isReset ? (
            <p
              className="text-[10px] leading-snug"
              style={{ color: "var(--editor-muted)" }}
            >
              Will restore each target&apos;s original icon
            </p>
          ) : null}
        </div>
      </HotspotTargetsPanel>
    </ActionNodeCard>
  );
}
