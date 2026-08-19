"use client";

import { Handle, Position, useNodeId } from "@xyflow/react";
import { ClipboardPaste, Copy, Trash2, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useActionsEditor } from "@/app/editor/_components/actions/actions-editor-context";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import { parseFlowNodeId } from "@/lib/editor/actions/flow-adapter";

type ActionNodeCardProps = {
  label: string;
  icon: LucideIcon;
  accent: string;
  selected?: boolean;
  showTarget?: boolean;
  showSource?: boolean;
  wide?: boolean;
  onDelete?: () => void;
  children?: ReactNode;
  footer?: ReactNode;
};

export function ActionNodeCard({
  label,
  icon: Icon,
  accent,
  selected = false,
  showTarget = true,
  showSource = true,
  wide = false,
  onDelete,
  children,
  footer,
}: ActionNodeCardProps) {
  const flowId = useNodeId();
  const parsed = flowId ? parseFlowNodeId(flowId) : null;
  const { clipboard, copyNode, pasteNode } = useActionsEditor();

  return (
    <div
      className={`editor-action-node ${wide ? "wide" : ""} ${selected ? "selected" : ""}`}
      style={{ borderColor: selected ? accent : undefined }}
    >
      {showTarget ? (
        <Handle
          type="target"
          position={Position.Left}
          className="editor-action-handle"
        />
      ) : null}
      {showSource ? (
        <Handle
          type="source"
          position={Position.Right}
          className="editor-action-handle"
        />
      ) : null}

      <div className="editor-action-node-header">
        <span
          className="editor-action-node-icon"
          style={{
            color: accent,
            background: `${accent}22`,
            borderColor: `${accent}55`,
          }}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="editor-action-node-label">{label}</span>
        <div
          className="editor-action-node-actions nodrag nopan"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {parsed ? (
            <>
              <IconButton
                title="Copy node"
                style={{ width: 24, height: 24 }}
                onClick={(e) => {
                  e.stopPropagation();
                  copyNode(parsed.hotspotId, parsed.nodeId);
                }}
              >
                <Copy className="h-3 w-3" />
              </IconButton>
              <IconButton
                title="Paste node"
                disabled={!clipboard}
                style={{ width: 24, height: 24 }}
                onClick={(e) => {
                  e.stopPropagation();
                  pasteNode(parsed.hotspotId, { nearNodeId: parsed.nodeId });
                }}
              >
                <ClipboardPaste className="h-3 w-3" />
              </IconButton>
            </>
          ) : null}
          {onDelete ? (
            <IconButton
              title="Delete node"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              style={{ width: 24, height: 24, color: "#ff8a95" }}
            >
              <Trash2 className="h-3 w-3" />
            </IconButton>
          ) : null}
        </div>
      </div>

      {children ? (
        <div className="editor-action-node-body">{children}</div>
      ) : null}
      {footer ? (
        <div className="editor-action-node-footer">{footer}</div>
      ) : null}
    </div>
  );
}
