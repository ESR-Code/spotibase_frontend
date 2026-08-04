export type ActionNodeType = "openModal" | "goToScene";
export type ActionNodeXY = { x: number; y: number };

type ActionNodeBase<T extends ActionNodeType, D> = {
  id: string;
  type: T;
  position: ActionNodeXY;
  data: D;
};

export type OpenModalActionNode = ActionNodeBase<
  "openModal",
  Record<string, never>
>;
export type GoToSceneActionNode = ActionNodeBase<
  "goToScene",
  { sceneId: string }
>;
export type ActionNode = OpenModalActionNode | GoToSceneActionNode;

export type ActionEdge = { id: string; source: string; target: string };

/**
 * Trigger ("hotspot clicked") is implicit; its id is TRIGGER_NODE_ID
 * and only its canvas position is stored.
 */
export type HotspotActionGraph = {
  trigger: { position: ActionNodeXY };
  nodes: ActionNode[];
  edges: ActionEdge[];
};

export const TRIGGER_NODE_ID = "trigger";
