import type { Hotspot } from "@/lib/editor/types/hotspot";
import type {
  ActionNode,
  ActionNodeType,
  ActionNodeXY,
  HotspotActionGraph,
  OpenModalActionNode,
  GoToSceneActionNode,
} from "@/lib/editor/types/hotspot-action";
import { TRIGGER_NODE_ID } from "@/lib/editor/types/hotspot-action";

export function newActionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `action-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const DEFAULT_TRIGGER_POS: ActionNodeXY = { x: 80, y: 120 };
const DEFAULT_OPEN_MODAL_POS: ActionNodeXY = { x: 360, y: 120 };

export function createActionNode(
  type: "openModal",
  position: ActionNodeXY,
): OpenModalActionNode;
export function createActionNode(
  type: "goToScene",
  position: ActionNodeXY,
): GoToSceneActionNode;
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
