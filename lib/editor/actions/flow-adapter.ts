import { TRIGGER_NODE_ID } from "@/lib/editor/actions/create-action-graph";
import type {
  ActionNode,
  HotspotActionGraph,
} from "@/lib/editor/types/hotspot-action";
import type { Hotspot } from "@/lib/editor/types/hotspot";
import type { Edge, Node } from "@xyflow/react";

export const LANE_HEIGHT = 220;
export const TRIGGER_FLOW_TYPE = "hotspotTrigger";

export type ActionFlowNodeData = {
  hotspotId: number;
  hotspotTitle: string;
  actionNode?: ActionNode;
  /** Present on trigger nodes. */
  isTrigger?: boolean;
};

export type ActionFlowEntry = {
  hotspot: Hotspot;
  graph: HotspotActionGraph;
  laneIndex: number;
};

export function flowNodeId(hotspotId: number, nodeId: string): string {
  return `h${hotspotId}:${nodeId}`;
}

export function parseFlowNodeId(
  id: string,
): { hotspotId: number; nodeId: string } | null {
  const match = /^h(\d+):(.+)$/.exec(id);
  if (!match) return null;
  return { hotspotId: Number(match[1]), nodeId: match[2] };
}

export function toFlowGraph(entries: ActionFlowEntry[]): {
  nodes: Node<ActionFlowNodeData>[];
  edges: Edge[];
} {
  const nodes: Node<ActionFlowNodeData>[] = [];
  const edges: Edge[] = [];

  for (const { hotspot, graph, laneIndex } of entries) {
    const yOffset = laneIndex * LANE_HEIGHT;

    nodes.push({
      id: flowNodeId(hotspot.id, TRIGGER_NODE_ID),
      type: TRIGGER_FLOW_TYPE,
      position: {
        x: graph.trigger.position.x,
        y: graph.trigger.position.y + yOffset,
      },
      data: {
        hotspotId: hotspot.id,
        hotspotTitle: hotspot.title,
        isTrigger: true,
      },
      deletable: false,
      selectable: true,
    });

    for (const actionNode of graph.nodes) {
      nodes.push({
        id: flowNodeId(hotspot.id, actionNode.id),
        type: actionNode.type,
        position: {
          x: actionNode.position.x,
          y: actionNode.position.y + yOffset,
        },
        data: {
          hotspotId: hotspot.id,
          hotspotTitle: hotspot.title,
          actionNode,
        },
        deletable: true,
      });
    }

    for (const edge of graph.edges) {
      edges.push({
        id: flowNodeId(hotspot.id, edge.id),
        source: flowNodeId(hotspot.id, edge.source),
        target: flowNodeId(hotspot.id, edge.target),
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
