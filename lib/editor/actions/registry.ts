import { createActionNode } from "@/lib/editor/actions/create-action-graph";
import { openHotspotInPreview } from "@/lib/editor/preview/open-hotspot-in-preview";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import type {
  ActionNode,
  ActionNodeType,
  ActionNodeXY,
} from "@/lib/editor/types/hotspot-action";
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
      const sceneId = node.data.sceneId;
      if (!sceneId) {
        toast.error("Go To Scene: no scene selected");
        return "stop";
      }
      const scenes = useScenesStore.getState().scenes;
      if (!scenes.some((s) => s.id === sceneId)) {
        toast.error("Go To Scene: target scene no longer exists");
        return "stop";
      }
      useScenesStore.getState().switchScene(sceneId);
    },
  },
};

export const ACTION_NODE_LIST = Object.values(ACTION_NODE_META);

export function getActionNodeMeta(type: ActionNodeType): ActionNodeMeta {
  return ACTION_NODE_META[type];
}
