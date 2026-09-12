import { playSubjectAnimation } from "@/lib/editor/engine/model-animation";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useModelStore } from "@/lib/editor/state/model-store";
import {
  asPlayAnimationTime,
  clampPlayAnimationSpeed,
  resolvePlayAnimationRange,
  type PlayAnimationActionNode,
} from "@/lib/editor/types/hotspot-action";

export function validatePlayAnimationData(
  data: PlayAnimationActionNode["data"],
): string | null {
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
 * Play the selected GLB clip in Preview and wait until it finishes.
 * Returns `"stop"` when playback is skipped or cancelled so the rest of
 * the chain does not run.
 */
export async function applyPlayAnimation(
  data: PlayAnimationActionNode["data"],
): Promise<"stop" | void> {
  if (!useEditorStore.getState().isPreview) return "stop";
  const clip = useModelStore
    .getState()
    .animations.find((item) => item.id === data.animationName.trim());
  const range = resolvePlayAnimationRange(data, clip?.duration ?? 0);
  const result = await playSubjectAnimation({
    animationName: data.animationName.trim(),
    inverse: Boolean(data.inverse),
    speed: clampPlayAnimationSpeed(data.speed),
    startTime: range.startTime,
    endTime: range.endTime,
  });
  if (result !== "completed") return "stop";
}
