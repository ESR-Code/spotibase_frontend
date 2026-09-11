import {
  asNumberTitleItems,
  cloneActionNodeAt,
  createActionNode,
  newActionId,
  TRIGGER_NODE_ID,
} from "@/lib/editor/actions/create-action-graph";
import { canConnectToForEach } from "@/lib/editor/actions/for-each";
import {
  asSpawnCoordMode,
  asSpawnHotspotTemplate,
} from "@/lib/editor/actions/spawn-hotspot-template";
import type {
  ActionEdge,
  ActionNode,
  ActionNodeType,
  ActionNodeXY,
  HotspotActionGraph,
  SendPostMessageActionNode,
} from "@/lib/editor/types/hotspot-action";
import {
  clampPlayAnimationSpeed,
  clampSubscribeIntervalMs,
  createEmptyPostMessageReceiveEvent,
  firstPostMessageReceiveHandleId,
  isPostMessageReceiveHandle,
  MENU_BUTTON_HANDLE_NORMAL,
  MENU_BUTTON_HANDLE_TOGGLED,
  mirrorReceiveEventLegacyFields,
  normalizeReceiveEvents,
  OPEN_MODAL_HANDLE_ON_CLOSE,
  OPEN_MODAL_HANDLE_ON_OPEN,
  parsePostMessageReceiveEvents,
  postMessageReceiveHandleId,
  parseSwitchCases,
  isSwitchCaseHandle,
  SWITCH_HANDLE_DEFAULT,
  switchCaseHandleId,
} from "@/lib/editor/types/hotspot-action";

export function normalizeSourceHandle(
  handle: string | null | undefined,
): string | null {
  if (handle == null || handle === "") return null;
  return handle;
}

function firstReceiveHandleForSource(
  graph: HotspotActionGraph,
  sourceId: string,
): string | null {
  const node = graph.nodes.find((item) => item.id === sourceId);
  if (node?.type !== "sendPostMessage") return null;
  if ((node.data.mode ?? "send") !== "receive") return null;
  return firstPostMessageReceiveHandleId(node.data);
}

/**
 * Whether an edge should be treated as coming from `handle`.
 * Legacy Open Modal edges (no handle) count as `onOpen`.
 * Legacy Post Message receive edges (no handle) count as the first event.
 */
export function edgeMatchesHandle(
  edge: ActionEdge,
  handle: string | null,
  graph?: HotspotActionGraph,
): boolean {
  const edgeHandle = normalizeSourceHandle(edge.sourceHandle);
  if (handle === OPEN_MODAL_HANDLE_ON_OPEN) {
    return (
      edgeHandle === OPEN_MODAL_HANDLE_ON_OPEN || edgeHandle === null
    );
  }
  if (handle === MENU_BUTTON_HANDLE_NORMAL) {
    return (
      edgeHandle === MENU_BUTTON_HANDLE_NORMAL || edgeHandle === null
    );
  }
  if (graph && isPostMessageReceiveHandle(handle)) {
    const first = firstReceiveHandleForSource(graph, edge.source);
    if (handle === first) {
      return edgeHandle === handle || edgeHandle === null;
    }
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
    (edge) =>
      edge.source === sourceId && edgeMatchesHandle(edge, handle, graph),
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
    if (node.type === "forEach" || node.type === "switch") break;
    // After the first hop, continue along the default (unnamed) output.
    currentId = nextAlongHandle(graph, currentId, null);
  }
  return chain;
}

/**
 * Every node reachable from `startId` via any outgoing edge (all Switch cases).
 * Does not include `startId` itself.
 */
export function nodesReachableFrom(
  graph: HotspotActionGraph,
  startId: string,
): ActionNode[] {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const result: ActionNode[] = [];
  const visited = new Set<string>([startId]);
  const queue: string[] = [];
  for (const edge of graph.edges) {
    if (edge.source === startId) queue.push(edge.target);
  }
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const node = byId.get(id);
    if (!node) continue;
    result.push(node);
    for (const edge of graph.edges) {
      if (edge.source === id) queue.push(edge.target);
    }
  }
  return result;
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
    if (node.type === "forEach" || node.type === "switch") {
      break;
    }
    if (
      node.type === "sendPostMessage" &&
      (node.data.mode ?? "send") === "receive"
    ) {
      break;
    }
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

  const targetNode = graph.nodes.find((n) => n.id === target);
  if (targetNode?.type === "forEach") {
    const sourceNode = graph.nodes.find((n) => n.id === source);
    if (!canConnectToForEach(sourceNode?.type)) return graph;
  }

  const handle = normalizeSourceHandle(sourceHandle);
  const firstReceiveHandle = firstReceiveHandleForSource(graph, source);
  const edges = graph.edges.filter((edge) => {
    if (edge.source !== source) return true;
    if (handle === OPEN_MODAL_HANDLE_ON_OPEN) {
      return !edgeMatchesHandle(edge, OPEN_MODAL_HANDLE_ON_OPEN, graph);
    }
    if (handle === OPEN_MODAL_HANDLE_ON_CLOSE) {
      return (
        normalizeSourceHandle(edge.sourceHandle) !== OPEN_MODAL_HANDLE_ON_CLOSE
      );
    }
    if (handle === MENU_BUTTON_HANDLE_NORMAL) {
      return !edgeMatchesHandle(edge, MENU_BUTTON_HANDLE_NORMAL, graph);
    }
    if (handle === MENU_BUTTON_HANDLE_TOGGLED) {
      return (
        normalizeSourceHandle(edge.sourceHandle) !== MENU_BUTTON_HANDLE_TOGGLED
      );
    }
    if (firstReceiveHandle && handle === firstReceiveHandle) {
      return !edgeMatchesHandle(edge, firstReceiveHandle, graph);
    }
    if (handle === null) {
      return normalizeSourceHandle(edge.sourceHandle) !== null;
    }
    return normalizeSourceHandle(edge.sourceHandle) !== handle;
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

export function removeEdge(
  graph: HotspotActionGraph,
  edgeId: string,
): HotspotActionGraph {
  if (!graph.edges.some((edge) => edge.id === edgeId)) return graph;
  return {
    ...graph,
    edges: graph.edges.filter((edge) => edge.id !== edgeId),
  };
}

const PASTE_OFFSET = 48;

export function insertClonedNode(
  graph: HotspotActionGraph,
  source: ActionNode,
  position: ActionNodeXY,
): HotspotActionGraph {
  return {
    ...graph,
    nodes: [...graph.nodes, cloneActionNodeAt(source, position)],
  };
}

export function pastePositionNear(
  graph: HotspotActionGraph,
  nearNodeId?: string,
): ActionNodeXY {
  if (nearNodeId && nearNodeId !== TRIGGER_NODE_ID) {
    const near = graph.nodes.find((node) => node.id === nearNodeId);
    if (near) {
      return {
        x: near.position.x + PASTE_OFFSET,
        y: near.position.y + PASTE_OFFSET,
      };
    }
  }
  return {
    x: graph.trigger.position.x + 280,
    y: graph.trigger.position.y,
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

function patchSendPostMessageData(
  data: SendPostMessageActionNode["data"],
  patch: Record<string, unknown>,
): SendPostMessageActionNode["data"] {
  const target =
    patch.target === "parent" ||
    patch.target === "opener" ||
    patch.target === "top" ||
    patch.target === "self"
      ? patch.target
      : data.target;
  const mode =
    patch.mode === "send" || patch.mode === "receive"
      ? patch.mode
      : (data.mode ?? "send");

  let receiveEvents = Object.prototype.hasOwnProperty.call(
    patch,
    "receiveEvents",
  )
    ? parsePostMessageReceiveEvents(patch.receiveEvents)
    : normalizeReceiveEvents({ ...data, mode });

  if (mode === "receive" && receiveEvents.length === 0) {
    receiveEvents = normalizeReceiveEvents({ ...data, mode: "receive" });
    if (receiveEvents.length === 0) {
      receiveEvents = [createEmptyPostMessageReceiveEvent()];
    }
  }

  const next: SendPostMessageActionNode["data"] = {
    mode,
    eventName:
      typeof patch.eventName === "string" ? patch.eventName : data.eventName,
    payloadJson:
      typeof patch.payloadJson === "string"
        ? patch.payloadJson
        : data.payloadJson,
    targetOrigin:
      typeof patch.targetOrigin === "string"
        ? patch.targetOrigin
        : data.targetOrigin,
    target,
    payloadFields: Array.isArray(patch.payloadFields)
      ? patch.payloadFields.filter(
          (field): field is string => typeof field === "string",
        )
      : (data.payloadFields ?? []),
    lastPayloadJson:
      typeof patch.lastPayloadJson === "string"
        ? patch.lastPayloadJson
        : (data.lastPayloadJson ?? ""),
    receiveEvents,
  };

  if (mode === "receive") {
    const mirrored = mirrorReceiveEventLegacyFields(next);
    return { ...next, ...mirrored };
  }
  return next;
}

function syncPostMessageReceiveEdges(
  edges: ActionEdge[],
  nodeId: string,
  prev: SendPostMessageActionNode["data"],
  next: SendPostMessageActionNode["data"],
): ActionEdge[] {
  const nextMode = next.mode ?? "send";
  const nextHandles = new Set(
    normalizeReceiveEvents(next).map((event) =>
      postMessageReceiveHandleId(event.id),
    ),
  );
  const firstNext = firstPostMessageReceiveHandleId(next);
  const firstPrev = firstPostMessageReceiveHandleId(prev);

  return edges.flatMap((edge) => {
    if (edge.source !== nodeId) return [edge];
    const handle = normalizeSourceHandle(edge.sourceHandle);

    if (nextMode === "send") {
      if (isPostMessageReceiveHandle(handle)) {
        if (handle === firstPrev || handle === firstNext) {
          return [{ id: edge.id, source: edge.source, target: edge.target }];
        }
        return [];
      }
      return [edge];
    }

    if (handle === null) {
      if (!firstNext) return [edge];
      return [{ ...edge, sourceHandle: firstNext }];
    }
    if (isPostMessageReceiveHandle(handle) && !nextHandles.has(handle)) {
      return [];
    }
    return [edge];
  });
}

function syncSwitchCaseEdges(
  edges: ActionEdge[],
  nodeId: string,
  nextCases: { id: string }[],
): ActionEdge[] {
  const nextHandles = new Set(
    nextCases.map((item) => switchCaseHandleId(item.id)),
  );
  nextHandles.add(SWITCH_HANDLE_DEFAULT);
  return edges.filter((edge) => {
    if (edge.source !== nodeId) return true;
    const handle = normalizeSourceHandle(edge.sourceHandle);
    if (handle === SWITCH_HANDLE_DEFAULT) return true;
    if (handle && isSwitchCaseHandle(handle) && !nextHandles.has(handle)) {
      return false;
    }
    return true;
  });
}

export function updateNodeData(
  graph: HotspotActionGraph,
  id: string,
  patch: Record<string, unknown>,
): HotspotActionGraph {
  const prevNode = graph.nodes.find((node) => node.id === id);
  const nodes = graph.nodes.map((node) => {
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
        return { ...node, data: patchSendPostMessageData(node.data, patch) };
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
      if (node.type === "subscribe") {
        return {
          ...node,
          data: {
            url: typeof patch.url === "string" ? patch.url : node.data.url,
            headersJson:
              typeof patch.headersJson === "string"
                ? patch.headersJson
                : node.data.headersJson,
            intervalMs:
              typeof patch.intervalMs === "number" ||
              typeof patch.intervalMs === "string"
                ? clampSubscribeIntervalMs(patch.intervalMs)
                : node.data.intervalMs,
            skipUnchanged:
              typeof patch.skipUnchanged === "boolean"
                ? patch.skipUnchanged
                : node.data.skipUnchanged,
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
      if (node.type === "enableDisableMesh") {
        return {
          ...node,
          data: {
            disabledMeshIds: Array.isArray(patch.disabledMeshIds)
              ? patch.disabledMeshIds.filter(
                  (id): id is string => typeof id === "string" && id.length > 0,
                )
              : node.data.disabledMeshIds,
          },
        };
      }
      if (node.type === "highlightMesh") {
        return {
          ...node,
          data: {
            meshIds: Array.isArray(patch.meshIds)
              ? patch.meshIds.filter(
                  (id): id is string => typeof id === "string" && id.length > 0,
                )
              : node.data.meshIds,
            tintEnabled:
              typeof patch.tintEnabled === "boolean"
                ? patch.tintEnabled
                : node.data.tintEnabled,
            tintColor:
              typeof patch.tintColor === "string"
                ? patch.tintColor
                : node.data.tintColor,
            tintOpacity:
              typeof patch.tintOpacity === "number" &&
              Number.isFinite(patch.tintOpacity)
                ? Math.min(1, Math.max(0, patch.tintOpacity))
                : node.data.tintOpacity,
            strokeEnabled:
              typeof patch.strokeEnabled === "boolean"
                ? patch.strokeEnabled
                : node.data.strokeEnabled,
            strokeColor:
              typeof patch.strokeColor === "string"
                ? patch.strokeColor
                : node.data.strokeColor,
            strokeWidth:
              typeof patch.strokeWidth === "number" &&
              Number.isFinite(patch.strokeWidth)
                ? Math.min(4, Math.max(1, patch.strokeWidth))
                : node.data.strokeWidth,
            tintSectionOpen:
              typeof patch.tintSectionOpen === "boolean"
                ? patch.tintSectionOpen
                : node.data.tintSectionOpen,
            strokeSectionOpen:
              typeof patch.strokeSectionOpen === "boolean"
                ? patch.strokeSectionOpen
                : node.data.strokeSectionOpen,
            meshesSectionOpen:
              typeof patch.meshesSectionOpen === "boolean"
                ? patch.meshesSectionOpen
                : node.data.meshesSectionOpen,
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
      if (node.type === "changeHotspotNumberTitle") {
        return {
          ...node,
          data: {
            items: Array.isArray(patch.items)
              ? asNumberTitleItems(patch.items)
              : node.data.items,
          },
        };
      }
      if (node.type === "forEach") {
        return {
          ...node,
          data: {
            itemsPath:
              typeof patch.itemsPath === "string"
                ? patch.itemsPath
                : node.data.itemsPath,
          },
        };
      }
      if (node.type === "spawnHotspots") {
        return {
          ...node,
          data: {
            coordMode: Object.prototype.hasOwnProperty.call(patch, "coordMode")
              ? asSpawnCoordMode(patch.coordMode)
              : node.data.coordMode,
            replaceOnRerun:
              typeof patch.replaceOnRerun === "boolean"
                ? patch.replaceOnRerun
                : node.data.replaceOnRerun,
            template: Object.prototype.hasOwnProperty.call(patch, "template")
              ? asSpawnHotspotTemplate({
                  ...node.data.template,
                  ...(typeof patch.template === "object" && patch.template
                    ? patch.template
                    : {}),
                })
              : node.data.template,
          },
        };
      }
      if (node.type === "switch") {
        return {
          ...node,
          data: {
            subject:
              typeof patch.subject === "string"
                ? patch.subject
                : node.data.subject,
            cases: Object.prototype.hasOwnProperty.call(patch, "cases")
              ? parseSwitchCases(patch.cases)
              : node.data.cases,
          },
        };
      }
      if (node.type === "playAnimation") {
        return {
          ...node,
          data: {
            animationName:
              typeof patch.animationName === "string"
                ? patch.animationName
                : node.data.animationName,
            inverse:
              typeof patch.inverse === "boolean"
                ? patch.inverse
                : node.data.inverse,
            speed:
              Object.prototype.hasOwnProperty.call(patch, "speed")
                ? clampPlayAnimationSpeed(patch.speed)
                : node.data.speed,
          },
        };
      }
      return node;
    });

  const nextNode = nodes.find((node) => node.id === id);
  let edges = graph.edges;
  if (
    prevNode?.type === "sendPostMessage" &&
    nextNode?.type === "sendPostMessage"
  ) {
    edges = syncPostMessageReceiveEdges(
      graph.edges,
      id,
      prevNode.data,
      nextNode.data,
    );
  } else if (prevNode?.type === "switch" && nextNode?.type === "switch") {
    edges = syncSwitchCaseEdges(graph.edges, id, nextNode.data.cases);
  }

  return {
    ...graph,
    nodes,
    edges,
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

/**
 * When enabling toggle on a custom button, unlabeled trigger edges become
 * `normal`. When disabling, `normal` edges become unlabeled and `toggled`
 * trigger edges are dropped.
 */
export function migrateMenuButtonToggleHandles(
  graph: HotspotActionGraph,
  toggleEnabled: boolean,
): HotspotActionGraph {
  const edges = graph.edges.flatMap((edge) => {
    if (edge.source !== TRIGGER_NODE_ID) return [edge];
    const handle = normalizeSourceHandle(edge.sourceHandle);
    if (toggleEnabled) {
      if (handle === null) {
        return [{ ...edge, sourceHandle: MENU_BUTTON_HANDLE_NORMAL }];
      }
      return [edge];
    }
    if (handle === MENU_BUTTON_HANDLE_TOGGLED) return [];
    if (handle === MENU_BUTTON_HANDLE_NORMAL) {
      return [{ id: edge.id, source: edge.source, target: edge.target }];
    }
    return [edge];
  });
  return { ...graph, edges };
}
