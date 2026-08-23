import { patchOwnedActionNodeData } from "@/lib/editor/actions/action-owners";
import { createActionNode, getActionGraph } from "@/lib/editor/actions/create-action-graph";
import {
  applyChangeHotspotColor,
  applyChangeHotspotIcon,
  applyChangeHotspotNumberTitle,
  validateChangeHotspotColorData,
  validateChangeHotspotIconData,
  validateChangeHotspotNumberTitleData,
} from "@/lib/editor/actions/change-hotspot-appearance";
import {
  applyEnableDisable,
  validateEnableDisableData,
} from "@/lib/editor/actions/enable-disable";
import {
  applyEnableDisableMesh,
  validateEnableDisableMeshData,
} from "@/lib/editor/actions/enable-disable-mesh";
import {
  applyHighlightMesh,
  validateHighlightMeshData,
} from "@/lib/editor/actions/highlight-mesh";
import {
  applyGoToHotspot,
  validateGoToHotspotData,
} from "@/lib/editor/actions/go-to-hotspot";
import { chainFrom } from "@/lib/editor/actions/graph-ops";
import {
  clearHttpRequestCached,
  executeHttpRequest,
  hasHttpRequestCached,
  httpRequestCacheKey,
  markHttpRequestCached,
  validateHttpRequestData,
} from "@/lib/editor/actions/http-request";
import { registerOpenModalCloseHandler } from "@/lib/editor/actions/open-modal-events";
import {
  parsePayloadJson,
  sendPostMessage,
} from "@/lib/editor/actions/send-post-message";
import {
  interpolateHttpRequestFields,
  interpolatePostMessageFields,
} from "@/lib/editor/actions/interpolate-fields";
import { transitionToScene } from "@/lib/editor/actions/transition-to-scene";
import { openHotspotInPreview } from "@/lib/editor/preview/open-hotspot-in-preview";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import type {
  ActionNode,
  ActionNodeType,
  ActionNodeXY,
} from "@/lib/editor/types/hotspot-action";
import type { SceneTypeId } from "@/lib/editor/types/scene-type";
import { OPEN_MODAL_HANDLE_ON_OPEN, normalizeReceiveEvents } from "@/lib/editor/types/hotspot-action";
import {
  normalizeExternalUrl,
  openExternalUrl,
} from "@/lib/editor/utils/open-external-url";
import { toast } from "sonner";

export type ActionRunContext = {
  /** Hotspot id when running from a hotspot click; null for start graphs. */
  hotspotId: number | null;
  /** Lane owner id (hotspot id, or synthetic start owner ids). */
  ownerId: number;
  /** Stable cache / response key prefix. */
  ownerKey: string;
};

export type ActionRunResult = void | "stop";

export type ActionNodeMeta<T extends ActionNodeType = ActionNodeType> = {
  type: T;
  label: string;
  description: string;
  createDefault: (position: ActionNodeXY) => ActionNode;
  /** Returns a human message when the node is not runnable yet. */
  validate: (node: ActionNode) => string | null;
  run: (
    node: ActionNode,
    ctx: ActionRunContext,
  ) => ActionRunResult | Promise<ActionRunResult>;
  /** If set, the add-node menu only offers this type on these scene types. */
  sceneTypes?: SceneTypeId[];
};

export function isActionNodeAvailableOnScene(
  type: ActionNodeType,
  sceneType: SceneTypeId,
): boolean {
  const allowed = ACTION_NODE_META[type].sceneTypes;
  return !allowed || allowed.includes(sceneType);
}

export function filterActionNodeTypesForScene(
  types: ActionNodeType[],
  sceneType: SceneTypeId,
): ActionNodeType[] {
  return types.filter((type) => isActionNodeAvailableOnScene(type, sceneType));
}

export const ACTION_NODE_META: Record<ActionNodeType, ActionNodeMeta> = {
  openModal: {
    type: "openModal",
    label: "Open Modal",
    description: "Open the marker dialog; wire onOpen / onClose for follow-ups.",
    createDefault: (position) => createActionNode("openModal", position),
    validate: () => null,
    run: async (node, ctx) => {
      if (node.type !== "openModal") return;
      if (ctx.hotspotId == null) {
        toast.error("Open Modal can only run from a hotspot click");
        return "stop";
      }

      openHotspotInPreview(ctx.hotspotId);

      registerOpenModalCloseHandler({
        ownerId: ctx.ownerId,
        nodeId: node.id,
        hotspotId: ctx.hotspotId,
        ownerKey: ctx.ownerKey,
      });

      const hotspot = useEditorStore
        .getState()
        .hotspots.find((item) => item.id === ctx.ownerId);
      const graph = hotspot ? getActionGraph(hotspot) : null;
      if (graph) {
        const onOpenChain = chainFrom(
          graph,
          node.id,
          OPEN_MODAL_HANDLE_ON_OPEN,
        );
        if (onOpenChain.length > 0) {
          const { runActionNodeList } = await import(
            "@/lib/editor/actions/run-action-graph"
          );
          await runActionNodeList(onOpenChain, ctx);
        }
      }

      // Branches continue from onOpen / onClose — stop the primary walk.
      return "stop";
    },
  },
  goToScene: {
    type: "goToScene",
    label: "Go To Scene",
    description: "Switch to another scene in the project.",
    createDefault: (position) => createActionNode("goToScene", position),
    validate: (node) => {
      if (node.type !== "goToScene") return null;
      if (!node.data.sceneId) return "Select a target scene";
      const scenes = useScenesStore.getState().scenes;
      if (!scenes.some((s) => s.id === node.data.sceneId)) {
        return "Target scene no longer exists";
      }
      return null;
    },
    run: (node) => {
      if (node.type !== "goToScene") return;
      return transitionToScene(node.data.sceneId);
    },
  },
  goToHotspot: {
    type: "goToHotspot",
    label: "Go To Hotspot",
    description: "Fly the camera to a hotspot, or its next/previous neighbor.",
    createDefault: (position) => createActionNode("goToHotspot", position),
    validate: (node) => {
      if (node.type !== "goToHotspot") return null;
      return validateGoToHotspotData(node.data);
    },
    run: (node) => {
      if (node.type !== "goToHotspot") return;
      return applyGoToHotspot(node.data);
    },
  },
  openUrl: {
    type: "openUrl",
    label: "Open URL",
    description: "Open a URL in a new browser tab.",
    createDefault: (position) => createActionNode("openUrl", position),
    validate: (node) => {
      if (node.type !== "openUrl") return null;
      if (!node.data.url.trim()) return "Enter a URL";
      if (!normalizeExternalUrl(node.data.url)) return "Enter a valid URL";
      return null;
    },
    run: (node) => {
      if (node.type !== "openUrl") return;
      if (!openExternalUrl(node.data.url)) {
        toast.error("Open URL: invalid or empty URL");
        return "stop";
      }
    },
  },
  sendPostMessage: {
    type: "sendPostMessage",
    label: "Post Message",
    description: "Send or receive window postMessage events.",
    createDefault: (position) => createActionNode("sendPostMessage", position),
    validate: (node) => {
      if (node.type !== "sendPostMessage") return null;
      const mode = node.data.mode ?? "send";
      if (mode === "receive") {
        const hasName = normalizeReceiveEvents(node.data).some((event) =>
          event.eventName.trim(),
        );
        return hasName ? null : "Enter an event name";
      }
      const interpolated = interpolatePostMessageFields(node.data);
      if (!interpolated.eventName.trim()) return "Enter an event name";
      const parsed = parsePayloadJson(interpolated.payloadJson);
      if (!parsed.ok) return parsed.error;
      if (!interpolated.targetOrigin.trim()) return "Enter a target origin";
      return null;
    },
    run: (node, ctx) => {
      if (node.type !== "sendPostMessage") return;
      if ((node.data.mode ?? "send") === "receive") return "stop";
      const interpolated = interpolatePostMessageFields(node.data);
      const error = sendPostMessage(
        { ...node, data: { ...node.data, ...interpolated } },
        ctx.hotspotId,
      );
      if (error) {
        toast.error(`Post Message: ${error}`);
        return "stop";
      }
    },
  },
  httpRequest: {
    type: "httpRequest",
    label: "HTTP Request",
    description: "Send an HTTP request to a URL.",
    createDefault: (position) => createActionNode("httpRequest", position),
    validate: (node) => {
      if (node.type !== "httpRequest") return null;
      return validateHttpRequestData({
        ...node.data,
        ...interpolateHttpRequestFields(node.data),
      });
    },
    run: async (node, ctx) => {
      if (node.type !== "httpRequest") return;

      const key = httpRequestCacheKey(ctx.ownerKey, node.id);
      const isPreview = useEditorStore.getState().isPreview;

      if (node.data.cacheReuse && isPreview && hasHttpRequestCached(key)) {
        return;
      }

      const interpolated = interpolateHttpRequestFields(node.data);
      const result = await executeHttpRequest({
        ...node.data,
        ...interpolated,
      });
      if (result.error && result.status == null) {
        toast.error(`HTTP Request: ${result.error}`);
        clearHttpRequestCached(key);
        patchOwnedActionNodeData(ctx.ownerId, node.id, {
          lastResponseJson: "",
        });
        return;
      }
      if (!result.ok) {
        toast.error(
          `HTTP Request: ${result.status ?? "—"} ${result.statusText}`.trim(),
        );
        clearHttpRequestCached(key);
        patchOwnedActionNodeData(ctx.ownerId, node.id, {
          lastResponseJson: "",
        });
        return;
      }

      if (result.json !== undefined) {
        markHttpRequestCached(key, result.json);
        patchOwnedActionNodeData(ctx.ownerId, node.id, {
          lastResponseJson: JSON.stringify(result.json),
        });
      } else {
        clearHttpRequestCached(key);
        patchOwnedActionNodeData(ctx.ownerId, node.id, {
          lastResponseJson: "",
        });
        if (node.data.cacheReuse && isPreview) {
          // Mark the attempt so cache-reuse skips a second network call.
          markHttpRequestCached(key, null);
        }
      }
    },
  },
  enableDisable: {
    type: "enableDisable",
    label: "Enable / Disable",
    description: "Show or hide hotspots and layers per checkbox.",
    createDefault: (position) => createActionNode("enableDisable", position),
    validate: (node) => {
      if (node.type !== "enableDisable") return null;
      return validateEnableDisableData(node.data);
    },
    run: (node) => {
      if (node.type !== "enableDisable") return;
      applyEnableDisable(node.data);
    },
  },
  enableDisableMesh: {
    type: "enableDisableMesh",
    label: "Enable / Disable Mesh",
    description: "Show or hide meshes in the uploaded 3D model.",
    sceneTypes: ["model"],
    createDefault: (position) =>
      createActionNode("enableDisableMesh", position),
    validate: (node) => {
      if (node.type !== "enableDisableMesh") return null;
      return validateEnableDisableMeshData(node.data);
    },
    run: (node) => {
      if (node.type !== "enableDisableMesh") return;
      applyEnableDisableMesh(node.data);
    },
  },
  highlightMesh: {
    type: "highlightMesh",
    label: "Highlight Mesh",
    description:
      "Tint or outline selected meshes. Chain more of these nodes for other colors.",
    sceneTypes: ["model"],
    createDefault: (position) => createActionNode("highlightMesh", position),
    validate: (node) => {
      if (node.type !== "highlightMesh") return null;
      return validateHighlightMeshData(node.data);
    },
    run: (node) => {
      if (node.type !== "highlightMesh") return;
      applyHighlightMesh(node.data);
    },
  },
  changeHotspotColor: {
    type: "changeHotspotColor",
    label: "Change Hotspot Color",
    description: "Change selected hotspot marker colors in Preview.",
    createDefault: (position) =>
      createActionNode("changeHotspotColor", position),
    validate: (node) => {
      if (node.type !== "changeHotspotColor") return null;
      return validateChangeHotspotColorData(node.data);
    },
    run: (node) => {
      if (node.type !== "changeHotspotColor") return;
      applyChangeHotspotColor(node.data);
    },
  },
  changeHotspotIcon: {
    type: "changeHotspotIcon",
    label: "Change Hotspot Icon",
    description: "Change selected hotspot marker icons in Preview.",
    createDefault: (position) =>
      createActionNode("changeHotspotIcon", position),
    validate: (node) => {
      if (node.type !== "changeHotspotIcon") return null;
      return validateChangeHotspotIconData(node.data);
    },
    run: (node) => {
      if (node.type !== "changeHotspotIcon") return;
      applyChangeHotspotIcon(node.data);
    },
  },
  changeHotspotNumberTitle: {
    type: "changeHotspotNumberTitle",
    label: "Change Number & Title",
    description:
      "Change selected hotspot titles and marker numbers in Preview.",
    createDefault: (position) =>
      createActionNode("changeHotspotNumberTitle", position),
    validate: (node) => {
      if (node.type !== "changeHotspotNumberTitle") return null;
      return validateChangeHotspotNumberTitleData(node.data);
    },
    run: (node) => {
      if (node.type !== "changeHotspotNumberTitle") return;
      applyChangeHotspotNumberTitle(node.data);
    },
  },
};

export const ACTION_NODE_LIST = Object.values(ACTION_NODE_META);

export function getActionNodeMeta(type: ActionNodeType): ActionNodeMeta {
  return ACTION_NODE_META[type];
}
