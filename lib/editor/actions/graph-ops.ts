import {
  createActionNode,
  newActionId,
  TRIGGER_NODE_ID,
} from "@/lib/editor/actions/create-action-graph";
import type {
  ActionNode,
  ActionNodeType,
  ActionNodeXY,
  HotspotActionGraph,
} from "@/lib/editor/types/hotspot-action";

/** Walk the linear chain starting from the trigger. */
export function chainFromTrigger(graph: HotspotActionGraph): ActionNode[] {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const outgoing = new Map(graph.edges.map((e) => [e.source, e.target]));
  const chain: ActionNode[] = [];
  const visited = new Set<string>();

  let currentId = outgoing.get(TRIGGER_NODE_ID);
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const node = byId.get(currentId);
    if (!node) break;
    chain.push(node);
    currentId = outgoing.get(currentId);
  }
  return chain;
}

/** Connect source → target, replacing any existing edge from source. */
export function connect(
  graph: HotspotActionGraph,
  source: string,
  target: string,
): HotspotActionGraph {
  if (source === target) return graph;
  if (source !== TRIGGER_NODE_ID && !graph.nodes.some((n) => n.id === source)) {
    return graph;
  }
  if (!graph.nodes.some((n) => n.id === target)) return graph;

  const edges = graph.edges.filter((e) => e.source !== source);
  edges.push({ id: newActionId(), source, target });
  return { ...graph, edges };
}

/**
 * Remove a node and relink its predecessor to its successor so the
 * chain stays connected.
 */
export function removeNode(
  graph: HotspotActionGraph,
  id: string,
): HotspotActionGraph {
  if (id === TRIGGER_NODE_ID) return graph;
  if (!graph.nodes.some((n) => n.id === id)) return graph;

  const inbound = graph.edges.find((e) => e.target === id);
  const outbound = graph.edges.find((e) => e.source === id);

  let edges = graph.edges.filter((e) => e.source !== id && e.target !== id);
  if (inbound && outbound) {
    edges = edges.filter((e) => e.source !== inbound.source);
    edges.push({
      id: newActionId(),
      source: inbound.source,
      target: outbound.target,
    });
  }

  return {
    ...graph,
    nodes: graph.nodes.filter((n) => n.id !== id),
    edges,
  };
}

export function addNode(
  graph: HotspotActionGraph,
  type: ActionNodeType,
  position: ActionNodeXY,
): { graph: HotspotActionGraph; node: ActionNode } {
  const node = createActionNode(type, position);
  return {
    graph: {
      ...graph,
      nodes: [...graph.nodes, node],
    },
    node,
  };
}

export function updateNodeData(
  graph: HotspotActionGraph,
  id: string,
  patch: Record<string, unknown>,
): HotspotActionGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((node) => {
      if (node.id !== id) return node;
      if (node.type === "goToScene") {
        return {
          ...node,
          data: {
            sceneId:
              typeof patch.sceneId === "string"
                ? patch.sceneId
                : node.data.sceneId,
          },
        };
      }
      if (node.type === "openUrl") {
        return {
          ...node,
          data: {
            url: typeof patch.url === "string" ? patch.url : node.data.url,
          },
        };
      }
      if (node.type === "sendPostMessage") {
        const target =
          patch.target === "parent" ||
          patch.target === "opener" ||
          patch.target === "top" ||
          patch.target === "self"
            ? patch.target
            : node.data.target;
        return {
          ...node,
          data: {
            eventName:
              typeof patch.eventName === "string"
                ? patch.eventName
                : node.data.eventName,
            payloadJson:
              typeof patch.payloadJson === "string"
                ? patch.payloadJson
                : node.data.payloadJson,
            targetOrigin:
              typeof patch.targetOrigin === "string"
                ? patch.targetOrigin
                : node.data.targetOrigin,
            target,
          },
        };
      }
      return node;
    }),
  };
}

export function moveNode(
  graph: HotspotActionGraph,
  id: string,
  position: ActionNodeXY,
): HotspotActionGraph {
  if (id === TRIGGER_NODE_ID) {
    return {
      ...graph,
      trigger: { position: { ...position } },
    };
  }
  return {
    ...graph,
    nodes: graph.nodes.map((node) =>
      node.id === id ? { ...node, position: { ...position } } : node,
    ),
  };
}

export function moveTrigger(
  graph: HotspotActionGraph,
  position: ActionNodeXY,
): HotspotActionGraph {
  return {
    ...graph,
    trigger: { position: { ...position } },
  };
}
