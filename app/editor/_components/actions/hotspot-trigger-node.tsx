"use client";

import {
  Handle,
  Position,
  useNodeId,
  useUpdateNodeInternals,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { ListTree, MousePointerClick, Play, Rocket } from "lucide-react";
import { useEffect } from "react";
import type { ActionFlowNodeData } from "@/lib/editor/actions/flow-adapter";
import { getCategoryLucideIcon } from "@/lib/editor/theme/category-icons";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import {
  LEGEND_HANDLE_ALL,
  legendCategoryHandleId,
  MENU_BUTTON_HANDLE_NORMAL,
  MENU_BUTTON_HANDLE_TOGGLED,
} from "@/lib/editor/types/hotspot-action";

export type HotspotTriggerFlowNode = Node<
  ActionFlowNodeData,
  "hotspotTrigger"
>;

export function HotspotTriggerNode({
  data,
  selected,
}: NodeProps<HotspotTriggerFlowNode>) {
  const kind = data.triggerKind ?? "hotspot";
  const nodeId = useNodeId();
  const updateNodeInternals = useUpdateNodeInternals();
  const legendCategories = useSettingsStore((s) => s.legendCategories);
  const MenuIcon = getCategoryLucideIcon(data.triggerIcon ?? "Star");
  const toggleEnabled = kind === "menuButton" && Boolean(data.toggleEnabled);
  const legendEnabled = kind === "legend";
  const legendLayoutKey = legendCategories.map((c) => c.id).join(",");

  useEffect(() => {
    if (!legendEnabled || !nodeId) return;
    updateNodeInternals(nodeId);
  }, [legendEnabled, legendLayoutKey, nodeId, updateNodeInternals]);

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
        : kind === "legend"
          ? {
              label: "Legend category",
              subtitle: "Selected in Preview legend",
              chip: "LEGEND",
              Icon: ListTree,
              color: "#3fb8af",
              bg: "rgba(63,184,175,0.15)",
              border: "rgba(63,184,175,0.4)",
            }
        : kind === "menuButton"
          ? {
              label: data.hotspotTitle || "Custom button",
              subtitle: toggleEnabled ? "Bottom menu · toggle" : "Bottom menu",
              chip: "MENU",
              Icon: MenuIcon,
              color: "var(--editor-teal)",
              bg: "rgba(63,184,175,0.15)",
              border: "rgba(63,184,175,0.4)",
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
      className={`editor-action-node editor-action-trigger ${legendEnabled ? "editor-action-trigger-legend" : ""} ${selected ? "selected" : ""}`}
    >
      {toggleEnabled || legendEnabled ? null : (
        <Handle
          type="source"
          position={Position.Right}
          className="editor-action-handle"
        />
      )}
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
      {toggleEnabled ? (
        <div className="editor-action-event-handles" aria-hidden>
          <div className="editor-action-event-handle-row">
            <span className="editor-action-event-handle-label">normal</span>
            <Handle
              id={MENU_BUTTON_HANDLE_NORMAL}
              type="source"
              position={Position.Right}
              className="editor-action-handle editor-action-handle-event"
            />
          </div>
          <div className="editor-action-event-handle-row">
            <span className="editor-action-event-handle-label">toggled</span>
            <Handle
              id={MENU_BUTTON_HANDLE_TOGGLED}
              type="source"
              position={Position.Right}
              className="editor-action-handle editor-action-handle-event"
            />
          </div>
        </div>
      ) : null}
      {legendEnabled ? (
        <div className="editor-action-event-handles" aria-hidden>
          <div className="editor-action-event-handle-row">
            <span className="editor-action-event-handle-label">All</span>
            <Handle
              id={LEGEND_HANDLE_ALL}
              type="source"
              position={Position.Right}
              className="editor-action-handle editor-action-handle-event"
            />
          </div>
          {legendCategories.map((category) => (
            <div key={category.id} className="editor-action-event-handle-row">
              <span
                className="editor-action-event-handle-label min-w-0 truncate"
                title={category.name}
              >
                <span
                  className="mr-1.5 inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ background: category.color }}
                />
                {category.name}
              </span>
              <Handle
                id={legendCategoryHandleId(category.id)}
                type="source"
                position={Position.Right}
                className="editor-action-handle editor-action-handle-event"
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
