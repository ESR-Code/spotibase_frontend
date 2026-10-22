import {
  playSubjectAnimation,
  startSubjectLoop,
  stopSubjectLoop,
} from "@/lib/editor/engine/model-animation";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useModelStore } from "@/lib/editor/state/model-store";
import {
  asPlayAnimationMode,
  asPlayAnimationStopBehavior,
  asPlayAnimationTime,
  isPlayAnimationLoopMode,
  clampPlayAnimationSpeed,
  resolvePlayAnimationRange,
  type PlayAnimationActionNode,
} from "@/lib/editor/types/hotspot-action";

export function validatePlayAnimationData(
  data: PlayAnimationActionNode["data"],
): string | null {
  if (asPlayAnimationMode(data.mode) === "stop") return null;
  const animationName = data.animationName.trim();
  if (!animationName) return "Select an animation";
  const animations = useModelStore.getState().animations;
  if (animations.length === 0) return "This model has no animations";
  const clip = animations.find((item) => item.id === animationName);
  if (!clip) return "Animation no longer exists";

  const start = asPlayAnimationTime(data.startTime, 0);
  const end = asPlayAnimationTime(data.endTime, 0);
  if (end > 0 && end <= start) return "End time must be after start time";
  if (clip.duration > 0 && start >= clip.duration) {
    return "Start time is past the clip duration";
  }
  return null;
}

/**
 * Preview only. `once` plays the selected GLB clip and waits until it
 * finishes; loop modes start a repeating loop and continue immediately;
 * `stop` ends that loop. Returns `"stop"` when playback is skipped or
 * cancelled so the rest of the chain does not run.
 */
export async function applyPlayAnimation(
  data: PlayAnimationActionNode["data"],
): Promise<"stop" | void> {
  if (!useEditorStore.getState().isPreview) return "stop";
  const mode = asPlayAnimationMode(data.mode);
  if (mode === "stop") {
    stopSubjectLoop(asPlayAnimationStopBehavior(data.stopBehavior));
    return;
  }

  const clip = useModelStore
    .getState()
    .animations.find((item) => item.id === data.animationName.trim());
  const range = resolvePlayAnimationRange(data, clip?.duration ?? 0);
  const opts = {
    animationName: data.animationName.trim(),
    inverse: Boolean(data.inverse),
    speed: clampPlayAnimationSpeed(data.speed),
    startTime: range.startTime,
    endTime: range.endTime,
  };

  if (isPlayAnimationLoopMode(mode)) {
    const started = startSubjectLoop({
      ...opts,
      pingPong: mode === "pingPong",
      resume: data.resumeAfterInterrupt !== false,
    });
    if (!started) return "stop";
    return;
  }

  const result = await playSubjectAnimation(opts);
  if (result !== "completed") return "stop";
}
