export type ActionNodeType =
  | "openModal"
  | "goToScene"
  | "goToHotspot"
  | "openUrl"
  | "sendPostMessage"
  | "httpRequest"
  | "enableDisable"
  | "enableDisableMesh"
  | "highlightMesh"
  | "changeHotspotColor"
  | "changeHotspotIcon";

/** Relative destination from the selected target hotspot. */
export type GoToHotspotOffset = "self" | "next" | "prev";

export type ActionNodeXY = { x: number; y: number };

export type PostMessageTarget = "parent" | "opener" | "top" | "self";

export type PostMessageMode = "send" | "receive";

/** One named incoming event on a receive-mode Post Message node. */
export type PostMessageReceiveEvent = {
  id: string;
  eventName: string;
  payloadFields: string[];
  lastPayloadJson: string;
};

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
export type GoToHotspotActionNode = ActionNodeBase<
  "goToHotspot",
  {
    /**
     * Target hotspot reference. Static examples: `3`, `HSP-003`.
     * Dynamic: `HSP-{{id}}` or `{{hotspotId}}` (resolved at Preview).
     */
    hotspotRef: string;
    /**
     * `self` → fly to the selected hotspot.
     * `next` / `prev` → fly to the neighbor after / before it (scene order, wraps).
     */
    offset: GoToHotspotOffset;
    /**
     * When true, also run the destination hotspot's action chain after
     * the camera focuses. Default false.
     */
    runTargetActions: boolean;
  }
>;
export type OpenUrlActionNode = ActionNodeBase<"openUrl", { url: string }>;
export type SendPostMessageActionNode = ActionNodeBase<
  "sendPostMessage",
  {
    /** Send an event, or listen for an incoming event. */
    mode: PostMessageMode;
    /** Name/type of the message event (send mode; first receive event is mirrored). */
    eventName: string;
    /** JSON object string included as the message payload (send mode). */
    payloadJson: string;
    /** postMessage targetOrigin. Use "*" to allow any (send mode). */
    targetOrigin: string;
    /** Which browsing context receives the message (send mode). */
    target: PostMessageTarget;
    /**
     * Declared payload field paths for receive mode (e.g. `user.name`).
     * Mirrored from the first receive event for backward compatibility.
     */
    payloadFields: string[];
    /**
     * Last received JSON payload (receive mode).
     * Used at Preview time to resolve declared field chips.
     */
    lastPayloadJson: string;
    /**
     * Incoming events for receive mode. Each event gets its own source handle.
     * Empty / omitted is treated as a single legacy event from `eventName`.
     */
    receiveEvents: PostMessageReceiveEvent[];
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
export type EnableDisableMeshActionNode = ActionNodeBase<
  "enableDisableMesh",
  {
    /**
     * Unchecked mesh ids from the 3D subject — hidden when this node runs.
     * All other model meshes stay visible. Empty = everything enabled.
     */
    disabledMeshIds: string[];
  }
>;
export type HighlightMeshActionNode = ActionNodeBase<
  "highlightMesh",
  {
    /** Checked mesh ids that receive the highlight when this node runs. */
    meshIds: string[];
    /** When true, blend tintColor over the selected meshes. */
    tintEnabled: boolean;
    /** Hex tint color. Mixed with the original albedo by tintOpacity. */
    tintColor: string;
    /** 0–1 blend of original albedo → tintColor. */
    tintOpacity: number;
    /** When true, draw a PlayCanvas OutlineRenderer stroke around them. */
    strokeEnabled: boolean;
    /** Hex color for the outline stroke. Default white. */
    strokeColor: string;
    /** Relative outline thickness. 1 = native width, 4 = widest. */
    strokeWidth: number;
  }
>;
export type ChangeHotspotColorActionNode = ActionNodeBase<
  "changeHotspotColor",
  {
    /** Checked hotspot ids that receive the color change when this node runs. */
    hotspotIds: number[];
    /**
     * Color to apply in Preview. Empty string = restore each target's
     * authored (original) color.
     */
    color: string;
  }
>;
export type ChangeHotspotIconActionNode = ActionNodeBase<
  "changeHotspotIcon",
  {
    /** Checked hotspot ids that receive the icon change when this node runs. */
    hotspotIds: number[];
    /**
     * Icon name to apply in Preview. Empty string = restore each target's
     * authored (original) icon/style.
     */
    icon: string;
  }
>;
export type ActionNode =
  | OpenModalActionNode
  | GoToSceneActionNode
  | GoToHotspotActionNode
  | OpenUrlActionNode
  | SendPostMessageActionNode
  | HttpRequestActionNode
  | EnableDisableActionNode
  | EnableDisableMeshActionNode
  | HighlightMeshActionNode
  | ChangeHotspotColorActionNode
  | ChangeHotspotIconActionNode;

export type ActionEdge = {
  id: string;
  source: string;
  target: string;
  /**
   * Optional source handle id for multi-output nodes.
   * Open Modal uses `"onOpen"` / `"onClose"`.
   * Toggle custom-menu triggers use `"normal"` / `"toggled"`.
   * Post Message receive events use `"pm:<eventId>"`.
   * Omitted = default output.
   */
  sourceHandle?: string | null;
};

/** Source handle ids on the Open Modal action node. */
export const OPEN_MODAL_HANDLE_ON_OPEN = "onOpen";
export const OPEN_MODAL_HANDLE_ON_CLOSE = "onClose";

/** Stable id used when migrating a legacy single-event receive node. */
export const POST_MESSAGE_LEGACY_EVENT_ID = "default";

/** Source handle prefix for Post Message receive events (`pm:<eventId>`). */
export const POST_MESSAGE_RECEIVE_HANDLE_PREFIX = "pm:";

export function postMessageReceiveHandleId(eventId: string): string {
  return `${POST_MESSAGE_RECEIVE_HANDLE_PREFIX}${eventId}`;
}

export function isPostMessageReceiveHandle(
  handle: string | null | undefined,
): boolean {
  return (
    typeof handle === "string" &&
    handle.startsWith(POST_MESSAGE_RECEIVE_HANDLE_PREFIX)
  );
}

export function newPostMessageReceiveEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `pm-evt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyPostMessageReceiveEvent(): PostMessageReceiveEvent {
  return {
    id: newPostMessageReceiveEventId(),
    eventName: "",
    payloadFields: [],
    lastPayloadJson: "",
  };
}

function asReceiveEventFields(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((field): field is string => typeof field === "string");
}

export function parsePostMessageReceiveEvents(
  value: unknown,
): PostMessageReceiveEvent[] {
  if (!Array.isArray(value)) return [];
  const events: PostMessageReceiveEvent[] = [];
  for (const item of value) {
    if (item == null || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const id = typeof rec.id === "string" ? rec.id.trim() : "";
    if (!id) continue;
    events.push({
      id,
      eventName: typeof rec.eventName === "string" ? rec.eventName : "",
      payloadFields: asReceiveEventFields(rec.payloadFields),
      lastPayloadJson:
        typeof rec.lastPayloadJson === "string" ? rec.lastPayloadJson : "",
    });
  }
  return events;
}

/** Receive events, migrating legacy `eventName` + `payloadFields` when needed. */
export function normalizeReceiveEvents(data: {
  mode?: PostMessageMode | null;
  eventName?: string;
  payloadFields?: string[];
  lastPayloadJson?: string;
  receiveEvents?: PostMessageReceiveEvent[] | unknown;
}): PostMessageReceiveEvent[] {
  const parsed = parsePostMessageReceiveEvents(data.receiveEvents);
  if (parsed.length > 0) return parsed;
  if ((data.mode ?? "send") !== "receive") return [];
  return [
    {
      id: POST_MESSAGE_LEGACY_EVENT_ID,
      eventName: typeof data.eventName === "string" ? data.eventName : "",
      payloadFields: asReceiveEventFields(data.payloadFields),
      lastPayloadJson:
        typeof data.lastPayloadJson === "string" ? data.lastPayloadJson : "",
    },
  ];
}

export function firstPostMessageReceiveHandleId(data: {
  mode?: PostMessageMode | null;
  eventName?: string;
  payloadFields?: string[];
  lastPayloadJson?: string;
  receiveEvents?: PostMessageReceiveEvent[] | unknown;
}): string | null {
  const first = normalizeReceiveEvents(data)[0];
  return first ? postMessageReceiveHandleId(first.id) : null;
}

/** Keep top-level eventName / payloadFields in sync with the first receive event. */
export function mirrorReceiveEventLegacyFields(
  data: SendPostMessageActionNode["data"],
): Pick<
  SendPostMessageActionNode["data"],
  "eventName" | "payloadFields" | "lastPayloadJson"
> {
  const events = normalizeReceiveEvents(data);
  const first = events[0];
  if (!first) {
    return {
      eventName: data.eventName,
      payloadFields: data.payloadFields ?? [],
      lastPayloadJson: data.lastPayloadJson ?? "",
    };
  }
  return {
    eventName: first.eventName,
    payloadFields: first.payloadFields,
    lastPayloadJson: first.lastPayloadJson || data.lastPayloadJson || "",
  };
}

/** Source handle ids on a toggle-enabled custom menu-button trigger. */
export const MENU_BUTTON_HANDLE_NORMAL = "normal";
export const MENU_BUTTON_HANDLE_TOGGLED = "toggled";

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

export const GO_TO_HOTSPOT_OFFSETS: {
  value: GoToHotspotOffset;
  label: string;
}[] = [
  { value: "self", label: "Target" },
  { value: "prev", label: "Prev" },
  { value: "next", label: "Next" },
];
