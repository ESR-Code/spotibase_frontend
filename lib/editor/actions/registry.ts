import { createActionNode } from "@/lib/editor/actions/create-action-graph";
import { transitionToScene } from "@/lib/editor/actions/transition-to-scene";
import { openHotspotInPreview } from "@/lib/editor/preview/open-hotspot-in-preview";
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

export type ActionNodeMeta<T extends ActionNodeType = ActionNodeType> = {
  type: T;
  label: string;
  description: string;
  createDefault: (position: ActionNodeXY) => ActionNode;
  /** Returns a human message when the node is not runnable yet. */
  validate: (node: ActionNode) => string | null;
  run: (node: ActionNode, ctx: ActionRunContext) => void | "stop";
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
};

export const ACTION_NODE_LIST = Object.values(ACTION_NODE_META);

export function getActionNodeMeta(type: ActionNodeType): ActionNodeMeta {
  return ACTION_NODE_META[type];
}
