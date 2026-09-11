import { playSubjectAnimation } from "@/lib/editor/engine/model-animation";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useModelStore } from "@/lib/editor/state/model-store";
import {
  clampPlayAnimationSpeed,
  type PlayAnimationActionNode,
} from "@/lib/editor/types/hotspot-action";

export function validatePlayAnimationData(
  data: PlayAnimationActionNode["data"],
): string | null {
  const animationName = data.animationName.trim();
  if (!animationName) return "Select an animation";
  const animations = useModelStore.getState().animations;
  if (animations.length === 0) return "This model has no animations";
  if (!animations.some((clip) => clip.id === animationName)) {
    return "Animation no longer exists";
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
  const result = await playSubjectAnimation({
    animationName: data.animationName.trim(),
    inverse: Boolean(data.inverse),
    speed: clampPlayAnimationSpeed(data.speed),
  });
  if (result !== "completed") return "stop";
}
