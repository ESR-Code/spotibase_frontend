"use client";

import {
  BaseEdge,
  EdgeToolbar,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";
import { Trash2 } from "lucide-react";
import { useActionsEditor } from "@/app/editor/_components/actions/actions-editor-context";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import { parseFlowNodeId } from "@/lib/editor/actions/flow-adapter";

export const ACTIONS_EDGE_TYPE = "actionsEdge";

export type ActionsFlowEdge = Edge<Record<string, never>, typeof ACTIONS_EDGE_TYPE>;

export function ActionsEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  style,
  markerEnd,
}: EdgeProps<ActionsFlowEdge>) {
  const { deleteEdge } = useActionsEditor();
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={style}
        interactionWidth={28}
      />
      <EdgeToolbar
        edgeId={id}
        x={labelX}
        y={labelY}
        isVisible={Boolean(selected)}
        className="editor-actions-edge-toolbar"
      >
        <IconButton
          title="Delete connection"
          style={{ width: 26, height: 26, color: "#ff8a95" }}
          onClick={(event) => {
            event.stopPropagation();
            const parsed = parseFlowNodeId(id);
            if (!parsed) return;
            deleteEdge(parsed.hotspotId, parsed.nodeId);
          }}
        >
          <Trash2 className="h-3 w-3" />
        </IconButton>
      </EdgeToolbar>
    </>
  );
}
