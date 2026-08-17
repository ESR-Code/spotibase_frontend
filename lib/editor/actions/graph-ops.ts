import {
  createActionNode,
  newActionId,
  TRIGGER_NODE_ID,
} from "@/lib/editor/actions/create-action-graph";
import type {
  ActionEdge,
  ActionNode,
  ActionNodeType,
  ActionNodeXY,
  HotspotActionGraph,
} from "@/lib/editor/types/hotspot-action";
import {
  OPEN_MODAL_HANDLE_ON_CLOSE,
  OPEN_MODAL_HANDLE_ON_OPEN,
} from "@/lib/editor/types/hotspot-action";

export function normalizeSourceHandle(
  handle: string | null | undefined,
): string | null {
  if (handle == null || handle === "") return null;
  return handle;
}

/**
 * Whether an edge should be treated as coming from `handle`.
 * Legacy Open Modal edges (no handle) count as `onOpen`.
 */
export function edgeMatchesHandle(
  edge: ActionEdge,
  handle: string | null,
): boolean {
  const edgeHandle = normalizeSourceHandle(edge.sourceHandle);
  if (handle === OPEN_MODAL_HANDLE_ON_OPEN) {
    return (
      edgeHandle === OPEN_MODAL_HANDLE_ON_OPEN || edgeHandle === null
    );
  }
  if (handle === null) {
    return edgeHandle === null;
  }
  return edgeHandle === handle;
}

function nextAlongHandle(
  graph: HotspotActionGraph,
  sourceId: string,
  handle: string | null,
): string | undefined {
  return graph.edges.find(
    (edge) => edge.source === sourceId && edgeMatchesHandle(edge, handle),
  )?.target;
}

/** Walk a linear chain starting from `startId`'s outgoing `handle`. */
export function chainFrom(
  graph: HotspotActionGraph,
  startId: string,
  handle: string | null = null,
): ActionNode[] {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const chain: ActionNode[] = [];
  const visited = new Set<string>();

  let currentId = nextAlongHandle(graph, startId, handle);
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const node = byId.get(currentId);
    if (!node) break;
    chain.push(node);
    // After the first hop, continue along the default (unnamed) output.
    currentId = nextAlongHandle(graph, currentId, null);
  }
  return chain;
}

/**
 * Walk the primary chain from the trigger.
 * Open Modal continues via its onOpen branch (including legacy unlabeled edges).
 */
export function chainFromTrigger(graph: HotspotActionGraph): ActionNode[] {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const chain: ActionNode[] = [];
  const visited = new Set<string>();

  let currentId = nextAlongHandle(graph, TRIGGER_NODE_ID, null);
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const node = byId.get(currentId);
    if (!node) break;
    chain.push(node);
    const nextHandle =
      node.type === "openModal" ? OPEN_MODAL_HANDLE_ON_OPEN : null;
    currentId = nextAlongHandle(graph, currentId, nextHandle);
  }
  return chain;
}

/**
 * Connect source → target, replacing any existing edge from the same
 * source handle. For Open Modal `onOpen`, also replaces legacy unlabeled edges.
 */
export function connect(
  graph: HotspotActionGraph,
  source: string,
  target: string,
  sourceHandle?: string | null,
): HotspotActionGraph {
  if (source === target) return graph;
  if (source !== TRIGGER_NODE_ID && !graph.nodes.some((n) => n.id === source)) {
    return graph;
  }
  if (!graph.nodes.some((n) => n.id === target)) return graph;

  const handle = normalizeSourceHandle(sourceHandle);
  const edges = graph.edges.filter((edge) => {
    if (edge.source !== source) return true;
    if (handle === OPEN_MODAL_HANDLE_ON_OPEN) {
      return !edgeMatchesHandle(edge, OPEN_MODAL_HANDLE_ON_OPEN);
    }
    if (handle === OPEN_MODAL_HANDLE_ON_CLOSE) {
      return (
        normalizeSourceHandle(edge.sourceHandle) !== OPEN_MODAL_HANDLE_ON_CLOSE
      );
    }
    return normalizeSourceHandle(edge.sourceHandle) !== null;
  });

  const nextEdge: ActionEdge = {
    id: newActionId(),
    source,
    target,
  };
  if (handle) nextEdge.sourceHandle = handle;
  edges.push(nextEdge);

  return { ...graph, edges };
}

/**
 * Remove a node. When it has exactly one inbound and one outbound edge,
 * relink them so a simple chain stays connected.
 */
export function removeNode(
  graph: HotspotActionGraph,
  id: string,
): HotspotActionGraph {
  if (id === TRIGGER_NODE_ID) return graph;
  if (!graph.nodes.some((n) => n.id === id)) return graph;

  const inbound = graph.edges.filter((e) => e.target === id);
  const outbound = graph.edges.filter((e) => e.source === id);

  let edges = graph.edges.filter((e) => e.source !== id && e.target !== id);
  if (inbound.length === 1 && outbound.length === 1) {
    const inEdge = inbound[0]!;
    const outEdge = outbound[0]!;
    edges = edges.filter(
      (e) =>
        !(
          e.source === inEdge.source &&
          normalizeSourceHandle(e.sourceHandle) ===
            normalizeSourceHandle(inEdge.sourceHandle)
        ),
    );
    const bridged: ActionEdge = {
      id: newActionId(),
      source: inEdge.source,
      target: outEdge.target,
    };
    const handle = normalizeSourceHandle(inEdge.sourceHandle);
    if (handle) bridged.sourceHandle = handle;
    edges.push(bridged);
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
      if (node.type === "goToHotspot") {
        const offset =
          patch.offset === "self" ||
          patch.offset === "next" ||
          patch.offset === "prev"
            ? patch.offset
            : node.data.offset;
        return {
          ...node,
          data: {
            hotspotRef:
              typeof patch.hotspotRef === "string"
                ? patch.hotspotRef
                : node.data.hotspotRef,
            offset,
            runTargetActions:
              typeof patch.runTargetActions === "boolean"
                ? patch.runTargetActions
                : Boolean(node.data.runTargetActions),
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
        const mode =
          patch.mode === "send" || patch.mode === "receive"
            ? patch.mode
            : (node.data.mode ?? "send");
        return {
          ...node,
          data: {
            mode,
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
            payloadFields: Array.isArray(patch.payloadFields)
              ? patch.payloadFields.filter(
                  (field): field is string => typeof field === "string",
                )
              : (node.data.payloadFields ?? []),
            lastPayloadJson:
              typeof patch.lastPayloadJson === "string"
                ? patch.lastPayloadJson
                : (node.data.lastPayloadJson ?? ""),
          },
        };
      }
      if (node.type === "httpRequest") {
        const method =
          patch.method === "GET" ||
          patch.method === "POST" ||
          patch.method === "PUT" ||
          patch.method === "PATCH" ||
          patch.method === "DELETE" ||
          patch.method === "HEAD" ||
          patch.method === "OPTIONS"
            ? patch.method
            : node.data.method;
        return {
          ...node,
          data: {
            method,
            url: typeof patch.url === "string" ? patch.url : node.data.url,
            headersJson:
              typeof patch.headersJson === "string"
                ? patch.headersJson
                : node.data.headersJson,
            body: typeof patch.body === "string" ? patch.body : node.data.body,
            cacheReuse:
              typeof patch.cacheReuse === "boolean"
                ? patch.cacheReuse
                : node.data.cacheReuse,
            lastResponseJson:
              typeof patch.lastResponseJson === "string"
                ? patch.lastResponseJson
                : (node.data.lastResponseJson ?? ""),
          },
        };
      }
      if (node.type === "enableDisable") {
        return {
          ...node,
          data: {
            disabledHotspotIds: Array.isArray(patch.disabledHotspotIds)
              ? patch.disabledHotspotIds.filter(
                  (id): id is number =>
                    typeof id === "number" && Number.isFinite(id),
                )
              : node.data.disabledHotspotIds,
            disabledLayerIds: Array.isArray(patch.disabledLayerIds)
              ? patch.disabledLayerIds.filter(
                  (id): id is string => typeof id === "string" && id.length > 0,
                )
              : node.data.disabledLayerIds,
          },
        };
      }
      if (node.type === "changeHotspotColor") {
        return {
          ...node,
          data: {
            hotspotIds: Array.isArray(patch.hotspotIds)
              ? patch.hotspotIds.filter(
                  (id): id is number =>
                    typeof id === "number" && Number.isFinite(id),
                )
              : node.data.hotspotIds,
            color:
              typeof patch.color === "string" ? patch.color : node.data.color,
          },
        };
      }
      if (node.type === "changeHotspotIcon") {
        return {
          ...node,
          data: {
            hotspotIds: Array.isArray(patch.hotspotIds)
              ? patch.hotspotIds.filter(
                  (id): id is number =>
                    typeof id === "number" && Number.isFinite(id),
                )
              : node.data.hotspotIds,
            icon: typeof patch.icon === "string" ? patch.icon : node.data.icon,
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
