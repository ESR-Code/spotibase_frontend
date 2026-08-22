import type { Hotspot } from "@/lib/editor/types/hotspot";
import type {
  ActionNode,
  ActionNodeType,
  ActionNodeXY,
  ChangeHotspotColorActionNode,
  ChangeHotspotIconActionNode,
  EnableDisableActionNode,
  EnableDisableMeshActionNode,
  HighlightMeshActionNode,
  GoToHotspotActionNode,
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
import {
  DEFAULT_MESH_STROKE_COLOR,
  DEFAULT_MESH_STROKE_WIDTH,
  DEFAULT_MESH_TINT_COLOR,
  DEFAULT_MESH_TINT_OPACITY,
} from "@/lib/editor/actions/highlight-mesh";
import type { GoToHotspotOffset } from "@/lib/editor/types/hotspot-action";
import {
  firstPostMessageReceiveHandleId,
  normalizeReceiveEvents,
  OPEN_MODAL_HANDLE_ON_OPEN,
} from "@/lib/editor/types/hotspot-action";
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

function asGoToHotspotOffset(value: unknown): GoToHotspotOffset {
  if (value === "next" || value === "prev" || value === "self") return value;
  return "self";
}

function asHotspotRef(data: {
  hotspotRef?: unknown;
  hotspotId?: unknown;
}): string {
  if (typeof data.hotspotRef === "string") return data.hotspotRef;
  if (typeof data.hotspotId === "string") return data.hotspotId;
  if (
    typeof data.hotspotId === "number" &&
    Number.isFinite(data.hotspotId) &&
    data.hotspotId > 0
  ) {
    return `HSP-${String(data.hotspotId).padStart(3, "0")}`;
  }
  return "";
}

function asHexColor(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)
    ? value
    : fallback;
}

function asUnit(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
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
  type: "goToHotspot",
  position: ActionNodeXY,
): GoToHotspotActionNode;
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
  type: "enableDisableMesh",
  position: ActionNodeXY,
): EnableDisableMeshActionNode;
export function createActionNode(
  type: "highlightMesh",
  position: ActionNodeXY,
): HighlightMeshActionNode;
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
    case "goToHotspot":
      return {
        id: newActionId(),
        type: "goToHotspot",
        position: { ...position },
        data: { hotspotRef: "", offset: "self", runTargetActions: false },
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
          receiveEvents: [],
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
    case "enableDisableMesh":
      return {
        id: newActionId(),
        type: "enableDisableMesh",
        position: { ...position },
        data: {
          disabledMeshIds: [],
        },
      };
    case "highlightMesh":
      return {
        id: newActionId(),
        type: "highlightMesh",
        position: { ...position },
        data: {
          meshIds: [],
          tintEnabled: true,
          tintColor: DEFAULT_MESH_TINT_COLOR,
          tintOpacity: DEFAULT_MESH_TINT_OPACITY,
          strokeEnabled: true,
          strokeColor: DEFAULT_MESH_STROKE_COLOR,
          strokeWidth: DEFAULT_MESH_STROKE_WIDTH,
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
  const nodes = graph.nodes.map((node): ActionNode => {
      if (node.type === "goToScene") {
        return {
          id: node.id,
          type: "goToScene",
          position: { ...node.position },
          data: { sceneId: node.data.sceneId },
        };
      }
      if (node.type === "goToHotspot") {
        return {
          id: node.id,
          type: "goToHotspot",
          position: { ...node.position },
          data: {
            hotspotRef: asHotspotRef(node.data),
            offset: asGoToHotspotOffset(node.data.offset),
            runTargetActions: Boolean(node.data.runTargetActions),
          },
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
        const mode = asPostMessageMode(node.data.mode);
        const payloadFields = Array.isArray(node.data.payloadFields)
          ? node.data.payloadFields.filter(
              (field): field is string => typeof field === "string",
            )
          : [];
        const receiveEvents = normalizeReceiveEvents({
          mode,
          eventName: node.data.eventName,
          payloadFields,
          lastPayloadJson: node.data.lastPayloadJson ?? "",
          receiveEvents: node.data.receiveEvents,
        });
        const first = receiveEvents[0];
        return {
          id: node.id,
          type: "sendPostMessage",
          position: { ...node.position },
          data: {
            mode,
            eventName:
              mode === "receive" && first
                ? first.eventName
                : node.data.eventName,
            payloadJson: node.data.payloadJson,
            targetOrigin: node.data.targetOrigin,
            target: asPostMessageTarget(node.data.target),
            payloadFields:
              mode === "receive" && first
                ? first.payloadFields
                : payloadFields,
            lastPayloadJson:
              (mode === "receive" && first?.lastPayloadJson) ||
              node.data.lastPayloadJson ||
              "",
            receiveEvents,
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
      if (node.type === "enableDisableMesh") {
        return {
          id: node.id,
          type: "enableDisableMesh",
          position: { ...node.position },
          data: {
            disabledMeshIds: asStringIds(node.data.disabledMeshIds),
          },
        };
      }
      if (node.type === "highlightMesh") {
        return {
          id: node.id,
          type: "highlightMesh",
          position: { ...node.position },
          data: {
            meshIds: asStringIds(node.data.meshIds),
            tintEnabled: asBoolean(node.data.tintEnabled, true),
            tintColor: asHexColor(node.data.tintColor, DEFAULT_MESH_TINT_COLOR),
            tintOpacity: asUnit(node.data.tintOpacity, DEFAULT_MESH_TINT_OPACITY),
            strokeEnabled: asBoolean(node.data.strokeEnabled, true),
            strokeColor: asHexColor(
              node.data.strokeColor,
              DEFAULT_MESH_STROKE_COLOR,
            ),
            strokeWidth: Math.min(
              4,
              Math.max(
                1,
                typeof node.data.strokeWidth === "number"
                  ? node.data.strokeWidth
                  : DEFAULT_MESH_STROKE_WIDTH,
              ),
            ),
            tintSectionOpen: asBoolean(node.data.tintSectionOpen, true),
            strokeSectionOpen: asBoolean(node.data.strokeSectionOpen, true),
            meshesSectionOpen: asBoolean(node.data.meshesSectionOpen, false),
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
    });
  return {
    trigger: { position: { ...graph.trigger.position } },
    nodes,
    edges: graph.edges.map((edge) => {
      const sourceNode = nodes.find((node) => node.id === edge.source);
      const unlabeled =
        edge.sourceHandle == null || edge.sourceHandle === "";
      const legacyOpenModal =
        sourceNode?.type === "openModal" && unlabeled;
      const legacyReceive =
        sourceNode?.type === "sendPostMessage" &&
        (sourceNode.data.mode ?? "send") === "receive" &&
        unlabeled;
      const receiveHandle = legacyReceive
        ? firstPostMessageReceiveHandleId(sourceNode.data)
        : null;
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: legacyOpenModal
          ? OPEN_MODAL_HANDLE_ON_OPEN
          : receiveHandle
            ? receiveHandle
            : (edge.sourceHandle ?? null),
      };
    }),
  };
}

/** Deep-clone a node with a new id at `position` (no edges). */
export function cloneActionNodeAt(
  node: ActionNode,
  position: ActionNodeXY,
): ActionNode {
  const cloned = cloneActionGraph({
    trigger: { position: { x: 0, y: 0 } },
    nodes: [node],
    edges: [],
  }).nodes[0]!;
  return {
    ...cloned,
    id: newActionId(),
    position: { ...position },
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
