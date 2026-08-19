"use client";

import { NodeResizer, type Node, type NodeProps } from "@xyflow/react";
import { Frame, Trash2 } from "lucide-react";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import { useActionFencesStore } from "@/lib/editor/state/action-fences-store";
import {
  ACTION_FENCE_COLORS,
  ACTION_FENCE_TYPE,
  type ActionFenceData,
} from "@/lib/editor/types/action-fence";

export type ActionFenceFlowNode = Node<ActionFenceData, typeof ACTION_FENCE_TYPE>;

export function ActionFenceNode({
  id,
  data,
  selected,
}: NodeProps<ActionFenceFlowNode>) {
  const updateFence = useActionFencesStore((s) => s.updateFence);
  const removeFence = useActionFencesStore((s) => s.removeFence);
  const fence = useActionFencesStore((s) =>
    s.byScope[data.scopeKey]?.find((item) => item.id === id),
  );
  const color = fence?.color || data.color || ACTION_FENCE_COLORS[0];
  const name = fence?.name ?? data.name;

  return (
    <div
      className="editor-action-fence"
      style={{
        borderColor: `${color}aa`,
        background: `${color}18`,
      }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={220}
        minHeight={140}
        color={color}
        lineStyle={{ borderColor: color }}
        handleStyle={{
          width: 8,
          height: 8,
          borderRadius: 2,
          borderColor: color,
          background: color,
        }}
      />
      <div
        className="editor-action-fence-drag"
        style={{ background: `${color}26` }}
      >
        <Frame className="h-3.5 w-3.5 shrink-0" style={{ color }} />
        <input
          className="editor-action-fence-name nodrag nopan nowheel"
          value={name}
          placeholder="Fence name"
          onChange={(event) => {
            const name = event.target.value;
            updateFence(data.scopeKey, id, { name });
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        />
        <div className="editor-action-fence-swatches nodrag nopan">
          {ACTION_FENCE_COLORS.map((swatch) => (
            <button
              key={swatch}
              type="button"
              title={swatch}
              className={`editor-action-fence-swatch ${swatch === color ? "is-active" : ""}`}
              style={{ background: swatch }}
              onClick={(event) => {
                event.stopPropagation();
                updateFence(data.scopeKey, id, { color: swatch });
              }}
              onPointerDown={(event) => event.stopPropagation()}
            />
          ))}
        </div>
        <IconButton
          title="Remove fence"
          className="nodrag nopan"
          style={{ width: 24, height: 24, color: "#ff8a95" }}
          onClick={(event) => {
            event.stopPropagation();
            removeFence(data.scopeKey, id);
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Trash2 className="h-3 w-3" />
        </IconButton>
      </div>
    </div>
  );
}
