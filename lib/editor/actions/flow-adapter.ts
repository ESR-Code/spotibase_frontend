import type { ActionTriggerKind } from "@/lib/editor/actions/action-owners";
import { TRIGGER_NODE_ID } from "@/lib/editor/actions/create-action-graph";
import type {
  ActionNode,
  ActionNodeType,
  HotspotActionGraph,
} from "@/lib/editor/types/hotspot-action";
import type { Edge, Node } from "@xyflow/react";

export const LANE_HEIGHT = 220;
export const TRIGGER_FLOW_TYPE = "hotspotTrigger";

export type ActionFlowNodeData = {
  /** Hotspot id, or synthetic App/Scene Start / menu-button owner id. */
  hotspotId: number;
  hotspotTitle: string;
  actionNode?: ActionNode;
  /** Present on trigger nodes. */
  isTrigger?: boolean;
  triggerKind?: ActionTriggerKind;
  /** Lucide icon name for custom menu-button triggers. */
  triggerIcon?: string;
  /** Toggled-state icon for toggle-enabled custom menu buttons. */
  toggledIcon?: string;
  /** Dual normal/toggled outputs on the trigger. */
  toggleEnabled?: boolean;
  allowedNodeTypes?: ActionNodeType[];
};

export type ActionFlowEntry = {
  ownerId: number;
  title: string;
  graph: HotspotActionGraph;
  laneIndex: number;
  triggerKind: ActionTriggerKind;
  triggerIcon?: string;
  toggledIcon?: string;
  toggleEnabled?: boolean;
  allowedNodeTypes: ActionNodeType[];
};

export function flowNodeId(ownerId: number, nodeId: string): string {
  return `h${ownerId}:${nodeId}`;
}

export function parseFlowNodeId(
  id: string,
): { hotspotId: number; nodeId: string } | null {
  const match = /^h(-?\d+):(.+)$/.exec(id);
  if (!match) return null;
  return { hotspotId: Number(match[1]), nodeId: match[2] };
}

export function toFlowGraph(entries: ActionFlowEntry[]): {
  nodes: Node<ActionFlowNodeData>[];
  edges: Edge[];
} {
  const nodes: Node<ActionFlowNodeData>[] = [];
  const edges: Edge[] = [];

  for (const entry of entries) {
    const {
      ownerId,
      title,
      graph,
      laneIndex,
      triggerKind,
      triggerIcon,
      toggledIcon,
      toggleEnabled,
      allowedNodeTypes,
    } = entry;
    const yOffset = laneIndex * LANE_HEIGHT;

    nodes.push({
      id: flowNodeId(ownerId, TRIGGER_NODE_ID),
      type: TRIGGER_FLOW_TYPE,
      position: {
        x: graph.trigger.position.x,
        y: graph.trigger.position.y + yOffset,
      },
      data: {
        hotspotId: ownerId,
        hotspotTitle: title,
        isTrigger: true,
        triggerKind,
        triggerIcon,
        toggledIcon,
        toggleEnabled,
        allowedNodeTypes,
      },
      deletable: false,
      selectable: true,
    });

    for (const actionNode of graph.nodes) {
      nodes.push({
        id: flowNodeId(ownerId, actionNode.id),
        type: actionNode.type,
        position: {
          x: actionNode.position.x,
          y: actionNode.position.y + yOffset,
        },
        data: {
          hotspotId: ownerId,
          hotspotTitle: title,
          actionNode,
          triggerKind,
          allowedNodeTypes,
        },
        deletable: true,
      });
    }

    for (const edge of graph.edges) {
      edges.push({
        id: flowNodeId(ownerId, edge.id),
        type: "actionsEdge",
        source: flowNodeId(ownerId, edge.source),
        target: flowNodeId(ownerId, edge.target),
        ...(edge.sourceHandle
          ? { sourceHandle: edge.sourceHandle }
          : {}),
      });
    }
  }

  return { nodes, edges };
}

/** Convert a flow canvas Y back to graph-local Y for a given lane. */
export function toGraphPosition(
  flowX: number,
  flowY: number,
  laneIndex: number,
): { x: number; y: number } {
  return {
    x: flowX,
    y: flowY - laneIndex * LANE_HEIGHT,
  };
}
