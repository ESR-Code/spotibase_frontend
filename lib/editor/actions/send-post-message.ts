import type {
  PostMessageTarget,
  SendPostMessageActionNode,
} from "@/lib/editor/types/hotspot-action";

export type PostMessageEnvelope = {
  source: "spotibase";
  event: string;
  data: unknown;
  hotspotId: number | null;
};

type ListenerEntry = {
  eventName: string;
  handler: (event: MessageEvent) => void;
};

const listeners = new Map<string, ListenerEntry>();

export function parsePayloadJson(
  raw: string,
): { ok: true; value: unknown } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: true, value: {} };
  }
  try {
    return { ok: true, value: JSON.parse(trimmed) as unknown };
  } catch {
    return { ok: false, error: "Payload must be valid JSON" };
  }
}

function resolveTargetWindow(target: PostMessageTarget): Window | null {
  if (typeof window === "undefined") return null;
  switch (target) {
    case "parent":
      return window.parent !== window ? window.parent : null;
    case "opener":
      return window.opener instanceof Window ? window.opener : null;
    case "top":
      return window.top !== window ? window.top : null;
    case "self":
      return window;
  }
}

/**
 * Sends `{ source, event, data, hotspotId }` via `postMessage`.
 * Returns an error message on failure, or null on success.
 */
export function sendPostMessage(
  node: SendPostMessageActionNode,
  hotspotId: number | null,
): string | null {
  const eventName = node.data.eventName.trim();
  if (!eventName) return "Enter an event name";

  const parsed = parsePayloadJson(node.data.payloadJson);
  if (!parsed.ok) return parsed.error;

  const targetOrigin = node.data.targetOrigin.trim() || "*";
  const targetWindow = resolveTargetWindow(node.data.target);
  if (!targetWindow) {
    return `No ${node.data.target} window available`;
  }

  const envelope: PostMessageEnvelope = {
    source: "spotibase",
    event: eventName,
    data: parsed.value,
    hotspotId,
  };

  try {
    targetWindow.postMessage(envelope, targetOrigin);
    return null;
  } catch {
    return "Failed to send postMessage";
  }
}

/** Pull payload for a named event from a message event, if it matches. */
export function extractPostMessagePayload(
  event: MessageEvent,
  eventName: string,
): unknown | undefined {
  const expected = eventName.trim();
  if (!expected) return undefined;

  const data = event.data;
  if (data == null || typeof data !== "object" || Array.isArray(data)) {
    return undefined;
  }

  const record = data as Record<string, unknown>;
  if (typeof record.event !== "string") return undefined;
  if (record.event !== expected) return undefined;

  // Prefer our envelope shape; also accept `{ event, data }`.
  if ("data" in record) return record.data;
  return undefined;
}

/**
 * Parse a receive node's allowed origins. Entries are normalized to
 * `scheme://host[:port]`; invalid ones are dropped; `*` is kept as is.
 */
export function parseAllowedOrigins(raw: string | undefined): string[] {
  const out: string[] = [];
  for (const part of (raw ?? "").split(/[\s,]+/)) {
    const entry = part.trim();
    if (!entry) continue;
    if (entry === "*") {
      out.push("*");
      continue;
    }
    try {
      const origin = new URL(entry).origin;
      if (origin && origin !== "null") out.push(origin);
    } catch {
      /* not a URL: ignore */
    }
  }
  return out;
}

/**
 * Whether a received message may run the receive chain. The page itself
 * (the Preview tester posts to its own window) is always allowed; anything
 * else must come from a listed origin, or the node must list `*`.
 */
export function isPostMessageSenderAllowed(
  event: Pick<MessageEvent, "origin" | "source">,
  allowedOrigins: string[],
): boolean {
  if (
    typeof window !== "undefined" &&
    event.source === window &&
    event.origin === window.location.origin
  ) {
    return true;
  }
  if (allowedOrigins.includes("*")) return true;
  return allowedOrigins.includes(event.origin);
}

export function clearPostMessageListeners(keyPrefix?: string): void {
  if (typeof window === "undefined") return;
  for (const [key, entry] of [...listeners.entries()]) {
    if (keyPrefix && !key.startsWith(keyPrefix)) continue;
    window.removeEventListener("message", entry.handler);
    listeners.delete(key);
  }
}

/**
 * Register (or replace) a window message listener for a receive node.
 * `listenerKey` should be stable, e.g. `${ownerKey}:${nodeId}`.
 */
export function registerPostMessageReceive(options: {
  listenerKey: string;
  eventName: string;
  /** Raw `allowedOrigins` from the node (see `parseAllowedOrigins`). */
  allowedOrigins?: string;
  onPayload: (payload: unknown) => void;
}): string | null {
  if (typeof window === "undefined") return "Window unavailable";
  const eventName = options.eventName.trim();
  if (!eventName) return "Enter an event name";

  const existing = listeners.get(options.listenerKey);
  if (existing) {
    window.removeEventListener("message", existing.handler);
    listeners.delete(options.listenerKey);
  }

  const allowedOrigins = parseAllowedOrigins(options.allowedOrigins);
  const handler = (event: MessageEvent) => {
    if (!isPostMessageSenderAllowed(event, allowedOrigins)) return;
    const payload = extractPostMessagePayload(event, eventName);
    if (payload === undefined) return;
    options.onPayload(payload);
  };

  window.addEventListener("message", handler);
  listeners.set(options.listenerKey, { eventName, handler });
  return null;
}

/**
 * Editor Preview tester: post `{ event, data }` to this window so live
 * receive listeners can fire. Returns an error message, or null on success.
 */
export function injectPostMessageReceiveTest(
  eventName: string,
  payloadJson: string,
): string | null {
  if (typeof window === "undefined") return "Window unavailable";
  const name = eventName.trim();
  if (!name) return "Enter an event name";

  const parsed = parsePayloadJson(payloadJson);
  if (!parsed.ok) return parsed.error;

  try {
    window.postMessage(
      { event: name, data: parsed.value },
      window.location.origin,
    );
    return null;
  } catch {
    return "Failed to send postMessage";
  }
}
