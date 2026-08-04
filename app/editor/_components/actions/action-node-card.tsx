"use client";

import { Handle, Position } from "@xyflow/react";
import { Trash2, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { IconButton } from "@/app/editor/_components/ui/icon-button";

type ActionNodeCardProps = {
  label: string;
  icon: LucideIcon;
  accent: string;
  selected?: boolean;
  showTarget?: boolean;
  showSource?: boolean;
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
  onDelete,
  children,
  footer,
}: ActionNodeCardProps) {
  return (
    <div
      className={`editor-action-node ${selected ? "selected" : ""}`}
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
        {onDelete ? (
          <IconButton
            title="Delete node"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            style={{ width: 26, height: 26, color: "#ff8a95" }}
          >
            <Trash2 className="h-3 w-3" />
          </IconButton>
        ) : null}
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
