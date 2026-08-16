import type { Hotspot } from "@/lib/editor/types/hotspot";
import type {
  ActionNode,
  ActionNodeType,
  ActionNodeXY,
  ChangeHotspotColorActionNode,
  ChangeHotspotIconActionNode,
  EnableDisableActionNode,
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
import { markerColorSwatches } from "@/lib/editor/theme/tokens";

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

function asPostMessageMode(value: unknown): "send" | "receive" {
  return value === "receive" ? "receive" : "send";
}

function asHttpMethod(value: unknown): HttpMethod {
  if (typeof value === "string" && HTTP_METHODS.includes(value as HttpMethod)) {
    return value as HttpMethod;
  }
  return "GET";
}

function asNumberIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (id): id is number => typeof id === "number" && Number.isFinite(id),
  );
}

function asStringIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (id): id is string => typeof id === "string" && id.length > 0,
  );
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
  type: "enableDisable",
  position: ActionNodeXY,
): EnableDisableActionNode;
export function createActionNode(
  type: "changeHotspotColor",
  position: ActionNodeXY,
): ChangeHotspotColorActionNode;
export function createActionNode(
  type: "changeHotspotIcon",
  position: ActionNodeXY,
): ChangeHotspotIconActionNode;
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
          mode: "send",
          eventName: "",
          payloadJson: "{\n  \n}",
          targetOrigin: "*",
          target: "parent",
          payloadFields: [],
          lastPayloadJson: "",
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
          lastResponseJson: "",
        },
      };
    case "enableDisable":
      return {
        id: newActionId(),
        type: "enableDisable",
        position: { ...position },
        data: {
          disabledHotspotIds: [],
          disabledLayerIds: [],
        },
      };
    case "changeHotspotColor":
      return {
        id: newActionId(),
        type: "changeHotspotColor",
        position: { ...position },
        data: {
          hotspotIds: [],
          color: markerColorSwatches[0],
        },
      };
    case "changeHotspotIcon":
      return {
        id: newActionId(),
        type: "changeHotspotIcon",
        position: { ...position },
        data: {
          hotspotIds: [],
          icon: "Info",
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

/** Empty chain used by Scene Start / App Start (trigger only). */
export function createEmptyActionGraph(): HotspotActionGraph {
  return {
    trigger: { position: { ...DEFAULT_TRIGGER_POS } },
    nodes: [],
    edges: [],
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
            mode: asPostMessageMode(node.data.mode),
            eventName: node.data.eventName,
            payloadJson: node.data.payloadJson,
            targetOrigin: node.data.targetOrigin,
            target: asPostMessageTarget(node.data.target),
            payloadFields: Array.isArray(node.data.payloadFields)
              ? node.data.payloadFields.filter(
                  (field): field is string => typeof field === "string",
                )
              : [],
            lastPayloadJson: node.data.lastPayloadJson ?? "",
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
            lastResponseJson: node.data.lastResponseJson ?? "",
          },
        };
      }
      if (node.type === "enableDisable") {
        return {
          id: node.id,
          type: "enableDisable",
          position: { ...node.position },
          data: {
            disabledHotspotIds: asNumberIds(node.data.disabledHotspotIds),
            disabledLayerIds: asStringIds(node.data.disabledLayerIds),
          },
        };
      }
      if (node.type === "changeHotspotColor") {
        return {
          id: node.id,
          type: "changeHotspotColor",
          position: { ...node.position },
          data: {
            hotspotIds: asNumberIds(node.data.hotspotIds),
            color: typeof node.data.color === "string" ? node.data.color : "",
          },
        };
      }
      if (node.type === "changeHotspotIcon") {
        return {
          id: node.id,
          type: "changeHotspotIcon",
          position: { ...node.position },
          data: {
            hotspotIds: asNumberIds(node.data.hotspotIds),
            icon: typeof node.data.icon === "string" ? node.data.icon : "",
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
