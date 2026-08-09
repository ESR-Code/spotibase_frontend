"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { MousePointerClick, Play, Rocket } from "lucide-react";
import type { ActionFlowNodeData } from "@/lib/editor/actions/flow-adapter";

export type HotspotTriggerFlowNode = Node<
  ActionFlowNodeData,
  "hotspotTrigger"
>;

export function HotspotTriggerNode({
  data,
  selected,
}: NodeProps<HotspotTriggerFlowNode>) {
  const kind = data.triggerKind ?? "hotspot";
  const meta =
    kind === "appStart"
      ? {
          label: "App Start",
          subtitle: "Runs once when Preview begins",
          chip: "APP",
          Icon: Rocket,
          color: "#c4a5ff",
          bg: "rgba(196,165,255,0.15)",
          border: "rgba(196,165,255,0.4)",
        }
      : kind === "sceneStart"
        ? {
            label: "Scene Start",
            subtitle: data.hotspotTitle,
            chip: "SCENE",
            Icon: Play,
            color: "var(--editor-amber)",
            bg: "rgba(242, 169, 59, 0.15)",
            border: "rgba(242, 169, 59, 0.4)",
          }
        : {
            label: "Hotspot clicked",
            subtitle: data.hotspotTitle,
            chip: `HSP-${String(data.hotspotId).padStart(3, "0")}`,
            Icon: MousePointerClick,
            color: "var(--editor-teal)",
            bg: "rgba(63,184,175,0.15)",
            border: "rgba(63,184,175,0.4)",
          };

  const Icon = meta.Icon;

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
            color: meta.color,
            background: meta.bg,
            borderColor: meta.border,
          }}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="editor-action-node-label">{meta.label}</div>
          <div
            className="truncate text-[10px]"
            style={{ color: "var(--editor-muted)" }}
          >
            {meta.subtitle}
          </div>
        </div>
        <span className="editor-chip">{meta.chip}</span>
      </div>
    </div>
  );
}
