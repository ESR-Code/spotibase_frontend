import { patchOwnedActionNodeData } from "@/lib/editor/actions/action-owners";
import { createActionNode } from "@/lib/editor/actions/create-action-graph";
import {
  clearHttpRequestCached,
  executeHttpRequest,
  hasHttpRequestCached,
  httpRequestCacheKey,
  markHttpRequestCached,
  validateHttpRequestData,
} from "@/lib/editor/actions/http-request";
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
};

export const ACTION_NODE_META: Record<ActionNodeType, ActionNodeMeta> = {
  openModal: {
    type: "openModal",
    label: "Open Modal",
    description: "Focus the hotspot and open its marker dialog.",
    createDefault: (position) => createActionNode("openModal", position),
    validate: () => null,
    run: (_node, ctx) => {
      if (ctx.hotspotId == null) {
        toast.error("Open Modal can only run from a hotspot click");
        return "stop";
      }
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
    label: "Post Message",
    description: "Send or receive window postMessage events.",
    createDefault: (position) => createActionNode("sendPostMessage", position),
    validate: (node) => {
      if (node.type !== "sendPostMessage") return null;
      const interpolated = interpolatePostMessageFields(node.data);
      if (!interpolated.eventName.trim()) return "Enter an event name";
      const mode = node.data.mode ?? "send";
      if (mode === "receive") return null;
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
};

export const ACTION_NODE_LIST = Object.values(ACTION_NODE_META);

export function getActionNodeMeta(type: ActionNodeType): ActionNodeMeta {
  return ACTION_NODE_META[type];
}
