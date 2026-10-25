import { abortRunRequests } from "@/lib/editor/actions/request-cancel";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import {
  clampWaitDurationSeconds,
  type WaitActionNode,
} from "@/lib/editor/types/hotspot-action";

export {
  clampWaitDurationSeconds,
  WAIT_DURATION_DEFAULT_SECONDS,
  WAIT_DURATION_MAX_SECONDS,
  WAIT_DURATION_MIN_SECONDS,
} from "@/lib/editor/types/hotspot-action";

type PendingWait = {
  timer: ReturnType<typeof setTimeout>;
  resolve: (result: "stop" | void) => void;
};

const pending = new Set<PendingWait>();
let generation = 0;

export function validateWaitData(
  data: WaitActionNode["data"],
): string | null {
  const num =
    typeof data.durationSeconds === "number"
      ? data.durationSeconds
      : Number(data.durationSeconds);
  if (!Number.isFinite(num)) return "Enter a duration";
  if (num < 0) return "Duration cannot be negative";
  return null;
}

/**
 * Run generation. Every in-flight action run remembers the value it started
 * under; once `cancelPendingWaits` bumps it (leaving Preview, entering Preview,
 * a scene switch) those runs stop before their next node / For Each item.
 */
export function currentRunGeneration(): number {
  return generation;
}

/**
 * Cancel in-flight Wait nodes and invalidate every running chain, so leftover
 * chains do not resume into the next scene or Preview session.
 */
export function cancelPendingWaits(): void {
  generation += 1;
  abortRunRequests();
  const waiting = [...pending];
  pending.clear();
  for (const wait of waiting) {
    clearTimeout(wait.timer);
    wait.resolve("stop");
  }
}

/**
 * Pause the chain, then continue. Returns `"stop"` when Preview is off
 * or the wait is cancelled (leave Preview / scene switch).
 */
export async function applyWait(
  data: WaitActionNode["data"],
): Promise<"stop" | void> {
  if (!useEditorStore.getState().isPreview) return "stop";
  const ms = clampWaitDurationSeconds(data.durationSeconds) * 1000;
  if (ms <= 0) return;

  const token = generation;
  return new Promise((resolve) => {
    const entry: PendingWait = {
      timer: setTimeout(() => {
        pending.delete(entry);
        if (
          token !== generation ||
          !useEditorStore.getState().isPreview
        ) {
          resolve("stop");
          return;
        }
        resolve();
      }, ms),
      resolve,
    };
    pending.add(entry);
  });
}
