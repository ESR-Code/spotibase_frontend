export type ActionNodeType =
  | "openModal"
  | "goToScene"
  | "openUrl"
  | "sendPostMessage";

export type ActionNodeXY = { x: number; y: number };

export type PostMessageTarget = "parent" | "opener" | "top" | "self";

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
export type OpenUrlActionNode = ActionNodeBase<"openUrl", { url: string }>;
export type SendPostMessageActionNode = ActionNodeBase<
  "sendPostMessage",
  {
    /** Name/type of the message event. */
    eventName: string;
    /** JSON object string included as the message payload. */
    payloadJson: string;
    /** postMessage targetOrigin. Use "*" to allow any. */
    targetOrigin: string;
    /** Which browsing context receives the message. */
    target: PostMessageTarget;
  }
>;
export type ActionNode =
  | OpenModalActionNode
  | GoToSceneActionNode
  | OpenUrlActionNode
  | SendPostMessageActionNode;

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

export const POST_MESSAGE_TARGETS: {
  value: PostMessageTarget;
  label: string;
}[] = [
  { value: "parent", label: "Parent window" },
  { value: "opener", label: "Opener window" },
  { value: "top", label: "Top window" },
  { value: "self", label: "This window" },
];
