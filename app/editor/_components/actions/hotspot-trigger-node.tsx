"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { MousePointerClick } from "lucide-react";
import type { ActionFlowNodeData } from "@/lib/editor/actions/flow-adapter";

export type HotspotTriggerFlowNode = Node<
  ActionFlowNodeData,
  "hotspotTrigger"
>;

export function HotspotTriggerNode({
  data,
  selected,
}: NodeProps<HotspotTriggerFlowNode>) {
  return (
    <div
      className={`editor-action-node editor-action-trigger ${selected ? "selected" : ""}`}
    >
      <Handle
        type="source"
        position={Position.Right}
        className="editor-action-handle"
      />
      <div className="editor-action-node-header">
        <span
          className="editor-action-node-icon"
          style={{
            color: "var(--editor-teal)",
            background: "rgba(63,184,175,0.15)",
            borderColor: "rgba(63,184,175,0.4)",
          }}
        >
          <MousePointerClick className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="editor-action-node-label">Hotspot clicked</div>
          <div
            className="truncate text-[10px]"
            style={{ color: "var(--editor-muted)" }}
          >
            {data.hotspotTitle}
          </div>
        </div>
        <span className="editor-chip">
          HSP-{String(data.hotspotId).padStart(3, "0")}
        </span>
      </div>
    </div>
  );
}
