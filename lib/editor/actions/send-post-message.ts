import type {
  PostMessageTarget,
  SendPostMessageActionNode,
} from "@/lib/editor/types/hotspot-action";

export type PostMessageEnvelope = {
  source: "vectorforge";
  event: string;
  data: unknown;
  hotspotId: number;
};

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
  hotspotId: number,
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
    source: "vectorforge",
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
