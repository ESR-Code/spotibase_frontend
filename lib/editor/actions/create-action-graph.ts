import type { Hotspot } from "@/lib/editor/types/hotspot";
import type {
  ActionNode,
  ActionNodeType,
  ActionNodeXY,
  HotspotActionGraph,
  HttpMethod,
  HttpRequestActionNode,
  OpenModalActionNode,
  GoToSceneActionNode,
  OpenUrlActionNode,
  PostMessageTarget,
  SendPostMessageActionNode,
} from "@/lib/editor/types/hotspot-action";
import { HTTP_METHODS, TRIGGER_NODE_ID } from "@/lib/editor/types/hotspot-action";

export function newActionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `action-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const DEFAULT_TRIGGER_POS: ActionNodeXY = { x: 80, y: 120 };
const DEFAULT_OPEN_MODAL_POS: ActionNodeXY = { x: 360, y: 120 };

function asPostMessageTarget(value: unknown): PostMessageTarget {
  if (
    value === "parent" ||
    value === "opener" ||
    value === "top" ||
    value === "self"
  ) {
    return value;
  }
  return "parent";
}

function asHttpMethod(value: unknown): HttpMethod {
  if (typeof value === "string" && HTTP_METHODS.includes(value as HttpMethod)) {
    return value as HttpMethod;
  }
  return "GET";
}

export function createActionNode(
  type: "openModal",
  position: ActionNodeXY,
): OpenModalActionNode;
export function createActionNode(
  type: "goToScene",
  position: ActionNodeXY,
): GoToSceneActionNode;
export function createActionNode(
  type: "openUrl",
  position: ActionNodeXY,
): OpenUrlActionNode;
export function createActionNode(
  type: "sendPostMessage",
  position: ActionNodeXY,
): SendPostMessageActionNode;
export function createActionNode(
  type: "httpRequest",
  position: ActionNodeXY,
): HttpRequestActionNode;
export function createActionNode(
  type: ActionNodeType,
  position: ActionNodeXY,
): ActionNode;
export function createActionNode(
  type: ActionNodeType,
  position: ActionNodeXY,
): ActionNode {
  switch (type) {
    case "openModal":
      return {
        id: newActionId(),
        type: "openModal",
        position: { ...position },
        data: {},
      };
    case "goToScene":
      return {
        id: newActionId(),
        type: "goToScene",
        position: { ...position },
        data: { sceneId: "" },
      };
    case "openUrl":
      return {
        id: newActionId(),
        type: "openUrl",
        position: { ...position },
        data: { url: "" },
      };
    case "sendPostMessage":
      return {
        id: newActionId(),
        type: "sendPostMessage",
        position: { ...position },
        data: {
          eventName: "",
          payloadJson: "{\n  \n}",
          targetOrigin: "*",
          target: "parent",
        },
      };
    case "httpRequest":
      return {
        id: newActionId(),
        type: "httpRequest",
        position: { ...position },
        data: {
          method: "GET",
          url: "",
          headersJson: "{\n  \n}",
          body: "",
          cacheReuse: false,
        },
      };
  }
}

/** Default graph: trigger → openModal. */
export function createDefaultActionGraph(): HotspotActionGraph {
  const openModal = createActionNode("openModal", DEFAULT_OPEN_MODAL_POS);
  return {
    trigger: { position: { ...DEFAULT_TRIGGER_POS } },
    nodes: [openModal],
    edges: [
      {
        id: newActionId(),
        source: TRIGGER_NODE_ID,
        target: openModal.id,
      },
    ],
  };
}

export function cloneActionGraph(
  graph: HotspotActionGraph,
): HotspotActionGraph {
  return {
    trigger: { position: { ...graph.trigger.position } },
    nodes: graph.nodes.map((node): ActionNode => {
      if (node.type === "goToScene") {
        return {
          id: node.id,
          type: "goToScene",
          position: { ...node.position },
          data: { sceneId: node.data.sceneId },
        };
      }
      if (node.type === "openUrl") {
        return {
          id: node.id,
          type: "openUrl",
          position: { ...node.position },
          data: { url: node.data.url },
        };
      }
      if (node.type === "sendPostMessage") {
        return {
          id: node.id,
          type: "sendPostMessage",
          position: { ...node.position },
          data: {
            eventName: node.data.eventName,
            payloadJson: node.data.payloadJson,
            targetOrigin: node.data.targetOrigin,
            target: asPostMessageTarget(node.data.target),
          },
        };
      }
      if (node.type === "httpRequest") {
        return {
          id: node.id,
          type: "httpRequest",
          position: { ...node.position },
          data: {
            method: asHttpMethod(node.data.method),
            url: node.data.url,
            headersJson: node.data.headersJson,
            body: node.data.body,
            cacheReuse: Boolean(node.data.cacheReuse),
          },
        };
      }
      return {
        id: node.id,
        type: "openModal",
        position: { ...node.position },
        data: {},
      };
    }),
    edges: graph.edges.map((edge) => ({ ...edge })),
  };
}

/**
 * Normalize hotspot.actions: `undefined` → default graph;
 * an explicit empty `nodes: []` means "do nothing on click".
 */
export function getActionGraph(hotspot: Hotspot): HotspotActionGraph {
  if (hotspot.actions == null) {
    return createDefaultActionGraph();
  }
  return cloneActionGraph(hotspot.actions);
}

export { TRIGGER_NODE_ID };
