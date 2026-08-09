import {
  createActionNode,
  getActionGraph,
} from "@/lib/editor/actions/create-action-graph";
import { updateNodeData } from "@/lib/editor/actions/graph-ops";
import {
  executeHttpRequest,
  getHttpRequestCached,
  hasHttpRequestCached,
  httpRequestCacheKey,
  markHttpRequestCached,
  validateHttpRequestData,
} from "@/lib/editor/actions/http-request";
import {
  parsePayloadJson,
  sendPostMessage,
} from "@/lib/editor/actions/send-post-message";
import { transitionToScene } from "@/lib/editor/actions/transition-to-scene";
import { openHotspotInPreview } from "@/lib/editor/preview/open-hotspot-in-preview";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import type {
  ActionNode,
  ActionNodeType,
  ActionNodeXY,
} from "@/lib/editor/types/hotspot-action";
import {
  normalizeExternalUrl,
  openExternalUrl,
} from "@/lib/editor/utils/open-external-url";
import { toast } from "sonner";

export type ActionRunContext = {
  hotspotId: number;
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
};

export const ACTION_NODE_META: Record<ActionNodeType, ActionNodeMeta> = {
  openModal: {
    type: "openModal",
    label: "Open Modal",
    description: "Focus the hotspot and open its marker dialog.",
    createDefault: (position) => createActionNode("openModal", position),
    validate: () => null,
    run: (_node, ctx) => {
      openHotspotInPreview(ctx.hotspotId);
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
    label: "Send Post Message",
    description: "Send a postMessage event to another window.",
    createDefault: (position) => createActionNode("sendPostMessage", position),
    validate: (node) => {
      if (node.type !== "sendPostMessage") return null;
      if (!node.data.eventName.trim()) return "Enter an event name";
      const parsed = parsePayloadJson(node.data.payloadJson);
      if (!parsed.ok) return parsed.error;
      if (!node.data.targetOrigin.trim()) return "Enter a target origin";
      return null;
    },
    run: (node, ctx) => {
      if (node.type !== "sendPostMessage") return;
      const error = sendPostMessage(node, ctx.hotspotId);
      if (error) {
        toast.error(`Send Post Message: ${error}`);
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
      return validateHttpRequestData(node.data);
    },
    run: async (node, ctx) => {
      if (node.type !== "httpRequest") return;

      const key = httpRequestCacheKey(ctx.hotspotId, node.id);
      const isPreview = useEditorStore.getState().isPreview;

      if (node.data.cacheReuse && isPreview && hasHttpRequestCached(key)) {
        return;
      }

      const result = await executeHttpRequest(node.data);
      if (result.error && result.status == null) {
        toast.error(`HTTP Request: ${result.error}`);
        return;
      }
      if (!result.ok) {
        toast.error(
          `HTTP Request: ${result.status ?? "—"} ${result.statusText}`.trim(),
        );
      }

      if (result.json !== undefined) {
        markHttpRequestCached(key, result.json);
        const hotspot = useEditorStore
          .getState()
          .hotspots.find((h) => h.id === ctx.hotspotId);
        if (hotspot) {
          const nextGraph = updateNodeData(getActionGraph(hotspot), node.id, {
            lastResponseJson: JSON.stringify(result.json),
          });
          useEditorStore.getState().updateHotspot(ctx.hotspotId, {
            actions: nextGraph,
          });
        }
      } else if (node.data.cacheReuse && isPreview) {
        // Still mark the attempt so cache-reuse skips a second network call.
        markHttpRequestCached(key, getHttpRequestCached(key) ?? null);
      }
    },
  },
};

export const ACTION_NODE_LIST = Object.values(ACTION_NODE_META);

export function getActionNodeMeta(type: ActionNodeType): ActionNodeMeta {
  return ACTION_NODE_META[type];
}
