export type ActionNodeType =
  | "openModal"
  | "goToScene"
  | "openUrl"
  | "sendPostMessage"
  | "httpRequest"
  | "enableDisable";

export type ActionNodeXY = { x: number; y: number };

export type PostMessageTarget = "parent" | "opener" | "top" | "self";

export type PostMessageMode = "send" | "receive";

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

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
    /** Send an event, or listen for an incoming event. */
    mode: PostMessageMode;
    /** Name/type of the message event. */
    eventName: string;
    /** JSON object string included as the message payload (send mode). */
    payloadJson: string;
    /** postMessage targetOrigin. Use "*" to allow any (send mode). */
    targetOrigin: string;
    /** Which browsing context receives the message (send mode). */
    target: PostMessageTarget;
    /**
     * Declared payload field paths for receive mode (e.g. `user.name`).
     * Offered in text blocks as insertable chips.
     */
    payloadFields: string[];
    /**
     * Last received JSON payload (receive mode).
     * Used at Preview time to resolve declared field chips.
     */
    lastPayloadJson: string;
  }
>;
export type HttpRequestActionNode = ActionNodeBase<
  "httpRequest",
  {
    method: HttpMethod;
    url: string;
    /** JSON object of request headers. */
    headersJson: string;
    /** Raw request body (ignored for GET/HEAD). */
    body: string;
    /**
     * When true, in Preview mode this node runs at most once per preview
     * session for the given hotspot/node.
     */
    cacheReuse: boolean;
    /**
     * Last successful JSON response body (from Test or Preview).
     * Used by text blocks to offer selectable field paths.
     */
    lastResponseJson: string;
  }
>;
export type EnableDisableActionNode = ActionNodeBase<
  "enableDisable",
  {
    /**
     * Unchecked hotspot ids — disabled when this node runs.
     * All other scene hotspots are enabled. Empty = everything enabled.
     */
    disabledHotspotIds: number[];
    /**
     * Unchecked layer ids — hidden when this node runs.
     * All other scene layers stay visible. Empty = everything enabled.
     */
    disabledLayerIds: string[];
  }
>;
export type ActionNode =
  | OpenModalActionNode
  | GoToSceneActionNode
  | OpenUrlActionNode
  | SendPostMessageActionNode
  | HttpRequestActionNode
  | EnableDisableActionNode;

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

export const POST_MESSAGE_MODES: {
  value: PostMessageMode;
  label: string;
  description: string;
}[] = [
  {
    value: "send",
    label: "Send event",
    description: "postMessage to another window",
  },
  {
    value: "receive",
    label: "Receive event",
    description: "Listen for an incoming postMessage",
  },
];

export const HTTP_METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];
