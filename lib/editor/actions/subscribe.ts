import {
  executeHttpRequest,
  validateHttpRequestData,
} from "@/lib/editor/actions/http-request";
import { interpolateHttpRequestFields } from "@/lib/editor/actions/interpolate-fields";
import {
  clampSubscribeIntervalMs,
  type SubscribeActionNode,
} from "@/lib/editor/types/hotspot-action";

export {
  clampSubscribeIntervalMs,
  SUBSCRIBE_INTERVAL_DEFAULT_MS,
  SUBSCRIBE_INTERVAL_MAX_MS,
  SUBSCRIBE_INTERVAL_MIN_MS,
} from "@/lib/editor/types/hotspot-action";

export function validateSubscribeData(
  data: Pick<SubscribeActionNode["data"], "url" | "headersJson">,
): string | null {
  return validateHttpRequestData({
    method: "GET",
    url: resolveSubscribeUrl(data.url),
    headersJson: data.headersJson,
    body: "",
    cacheReuse: false,
  });
}

export function interpolateSubscribeFields(data: {
  url: string;
  headersJson: string;
}): { url: string; headersJson: string } {
  const interpolated = interpolateHttpRequestFields({
    url: data.url,
    headersJson: data.headersJson,
    body: "",
  });
  return {
    url: resolveSubscribeUrl(interpolated.url),
    headersJson: interpolated.headersJson,
  };
}

/** Allow same-origin paths like `/subscribe_node_test` in the editor. */
function resolveSubscribeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    if (typeof window !== "undefined") {
      return `${window.location.origin}${trimmed}`;
    }
    return `http://localhost${trimmed}`;
  }
  return trimmed;
}

export async function executeSubscribeGet(data: {
  url: string;
  headersJson: string;
}) {
  return executeHttpRequest({
    method: "GET",
    url: data.url,
    headersJson: data.headersJson,
    body: "",
  });
}

function fingerprintJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

type PollHandle = {
  timer: ReturnType<typeof setInterval> | null;
  inFlight: boolean;
  lastFingerprint: string | null;
  generation: number;
};

const polls = new Map<string, PollHandle>();

function stopHandle(key: string, handle: PollHandle): void {
  if (handle.timer != null) {
    clearInterval(handle.timer);
    handle.timer = null;
  }
  handle.generation += 1;
  polls.delete(key);
}

export function stopSubscribePoll(key: string): void {
  const handle = polls.get(key);
  if (!handle) return;
  stopHandle(key, handle);
}

/** Stop polls whose key starts with `prefix`. Omit prefix to stop all. */
export function clearSubscribePolls(prefix?: string): void {
  for (const [key, handle] of [...polls.entries()]) {
    if (prefix && !key.startsWith(prefix)) continue;
    stopHandle(key, handle);
  }
}

export function startSubscribePoll(args: {
  key: string;
  intervalMs: number;
  skipUnchanged: boolean;
  fetchTick: () => Promise<{ ok: boolean; json: unknown } | null>;
  onPayload: (json: unknown) => Promise<void>;
}): void {
  stopSubscribePoll(args.key);

  const handle: PollHandle = {
    timer: null,
    inFlight: false,
    lastFingerprint: null,
    generation: 0,
  };
  polls.set(args.key, handle);
  const generation = handle.generation;
  const intervalMs = clampSubscribeIntervalMs(args.intervalMs);

  const tick = async () => {
    const current = polls.get(args.key);
    if (!current || current !== handle || current.generation !== generation) {
      return;
    }
    if (current.inFlight) return;
    current.inFlight = true;
    try {
      const result = await args.fetchTick();
      const still = polls.get(args.key);
      if (!still || still !== handle || still.generation !== generation) {
        return;
      }
      if (!result?.ok || result.json === undefined) return;

      const fingerprint = fingerprintJson(result.json);
      if (args.skipUnchanged && still.lastFingerprint === fingerprint) {
        return;
      }
      still.lastFingerprint = fingerprint;
      await args.onPayload(result.json);
    } finally {
      const still = polls.get(args.key);
      if (still === handle) still.inFlight = false;
    }
  };

  void tick();
  handle.timer = setInterval(() => {
    void tick();
  }, intervalMs);
}
