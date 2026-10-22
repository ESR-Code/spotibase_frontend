import type { Entity, GraphNode, Quat, Vec3 } from "playcanvas";
import { requestViewportRender } from "@/lib/editor/engine/viewport-invalidate";

export type PlaySubjectAnimationOpts = {
  animationName: string;
  inverse: boolean;
  speed: number;
  startTime: number;
  endTime: number;
};

export type PlaySubjectAnimationResult = "completed" | "cancelled";

export type StartSubjectLoopOpts = PlaySubjectAnimationOpts & {
  /** Bounce start↔end instead of jumping back to the start. */
  pingPong: boolean;
  /** Restart this loop after a one-shot clip interrupts it and completes. */
  resume: boolean;
};

export type ModelAnimationBinding = {
  getEntity: () => Entity | null;
  restoreBindPose: () => void;
  durationFor: (animationName: string) => number;
};

type BindPoseSample = {
  node: GraphNode;
  position: Vec3;
  rotation: Quat;
  scale: Vec3;
};

let bound: ModelAnimationBinding | null = null;
let generation = 0;
/**
 * The Preview loop to come back to. Only one clip plays at a time, so a
 * one-shot interrupts it; `playSubjectAnimation` restarts it on completion
 * when `resume` is set. Cleared by stop / reset / unbind / editor transport.
 */
let activeLoop: StartSubjectLoopOpts | null = null;

export function captureBindPose(root: Entity): BindPoseSample[] {
  const samples: BindPoseSample[] = [];
  root.forEach((node) => {
    samples.push({
      node,
      position: node.getLocalPosition().clone(),
      rotation: node.getLocalRotation().clone(),
      scale: node.getLocalScale().clone(),
    });
  });
  return samples;
}

export function restoreBindPose(samples: BindPoseSample[]): void {
  for (const sample of samples) {
    const node = sample.node;
    if (!node) continue;
    node.setLocalPosition(sample.position);
    node.setLocalRotation(sample.rotation);
    node.setLocalScale(sample.scale);
  }
}

export function bindModelAnimation(binding: ModelAnimationBinding): void {
  generation += 1;
  activeLoop = null;
  bound = binding;
}

export function unbindModelAnimation(): void {
  generation += 1;
  activeLoop = null;
  bound = null;
}

/** Stop playback and restore the imported bind pose. Cancels in-flight waits. */
export function resetModelAnimation(): void {
  generation += 1;
  activeLoop = null;
  const binding = bound;
  if (!binding) return;
  pauseAnim(binding.getEntity());
  binding.restoreBindPose();
  requestViewportRender({ shadows: true });
}

/** True while a clip is advancing (editor transport or Preview action). */
export function isModelAnimationPlaying(): boolean {
  return bound?.getEntity()?.anim?.playing === true;
}

function resolveClipDuration(clipId: string): number {
  const binding = bound;
  const layer = binding?.getEntity()?.anim?.baseLayer;
  const fromTrack = binding?.durationFor(clipId) ?? 0;
  const fromLayer = layer?.activeStateDuration ?? 0;
  const duration = fromTrack || fromLayer;
  return Number.isFinite(duration) && duration > 0 ? duration : 0;
}

/** Hold a clip pose at `time` for editor scrubbing. Cancels graph waits. */
export function seekEditorAnimation(clipId: string, time: number): void {
  generation += 1;
  activeLoop = null;
  const binding = bound;
  const entity = binding?.getEntity() ?? null;
  const anim = entity?.anim;
  const layer = anim?.baseLayer;
  if (!binding || !anim || !layer || !clipId) return;

  const duration = resolveClipDuration(clipId);
  const clamped = duration > 0 ? Math.min(Math.max(0, time), duration) : 0;

  anim.speed = 1;
  layer.play(clipId);
  // Component flag must be true or the clip does not evaluate.
  anim.playing = true;
  layer.activeStateCurrentTime = clamped;
  holdPoseAt(entity, clamped);
}

/** Play a clip at 1× from `fromTime` to the end. Cancels graph waits. */
export function playEditorAnimation(clipId: string, fromTime: number): void {
  const binding = bound;
  const entity = binding?.getEntity() ?? null;
  const anim = entity?.anim;
  const layer = anim?.baseLayer;
  if (!binding || !anim || !layer || !clipId) return;

  const duration = resolveClipDuration(clipId);
  const start = duration > 0 ? Math.min(Math.max(0, fromTime), duration) : 0;
  if (!(duration > start)) {
    seekEditorAnimation(clipId, duration);
    return;
  }

  generation += 1;
  activeLoop = null;
  anim.speed = 1;
  layer.play(clipId);
  anim.playing = true;
  layer.activeStateCurrentTime = start;
}

/** Stop advancing and keep the current clip pose. Cancels graph waits. */
export function pauseEditorAnimation(): void {
  generation += 1;
  activeLoop = null;
  holdPoseAt(bound?.getEntity() ?? null, readEditorAnimationTime());
}

export function readEditorAnimationTime(): number {
  const time = bound?.getEntity()?.anim?.baseLayer?.activeStateCurrentTime;
  return Number.isFinite(time) ? Math.max(0, time as number) : 0;
}

export async function playSubjectAnimation(
  opts: PlaySubjectAnimationOpts,
): Promise<PlaySubjectAnimationResult> {
  const token = ++generation;
  const binding = bound;
  const entity = binding?.getEntity() ?? null;
  const anim = entity?.anim;
  const layer = anim?.baseLayer;
  if (!binding || !anim || !layer) return "cancelled";

  const speed = Math.max(opts.speed, 0.01);
  anim.speed = opts.inverse ? -speed : speed;
  layer.play(opts.animationName);
  // PlayCanvas AnimComponentSystem only ticks layers when this is true.
  // layer.play() sets the controller flag, not the component flag.
  anim.playing = true;

  const clipDuration =
    layer.activeStateDuration || binding.durationFor(opts.animationName);
  const startTime = Math.min(Math.max(0, opts.startTime), clipDuration);
  const endTime =
    opts.endTime > startTime ? Math.min(opts.endTime, clipDuration) : clipDuration;
  const span = endTime - startTime;
  if (!(span > 0)) {
    holdPoseAt(entity, startTime);
    return "completed";
  }

  layer.activeStateCurrentTime = opts.inverse ? endTime : startTime;

  const waitMs = (span / speed) * 1000;
  const result = await waitForPlayback(token, waitMs);
  if (result === "completed" && token === generation) {
    if (!resumeActiveLoop()) holdPoseAt(entity, opts.inverse ? startTime : endTime);
  }
  return result;
}

/** Restart the remembered loop after a one-shot completes, when it asks to. */
function resumeActiveLoop(): boolean {
  if (!activeLoop?.resume) return false;
  return runLoop(activeLoop, ++generation);
}

/**
 * Start a repeating Preview loop and return without waiting. Replaces any
 * earlier loop and interrupts any one-shot clip.
 */
export function startSubjectLoop(opts: StartSubjectLoopOpts): boolean {
  const token = ++generation;
  activeLoop = null;
  if (!runLoop(opts, token)) return false;
  activeLoop = opts;
  return true;
}

/** End the Preview loop: keep its current pose or restore the bind pose. */
export function stopSubjectLoop(behavior: "hold" | "rest"): void {
  if (behavior === "rest") {
    resetModelAnimation();
    return;
  }
  generation += 1;
  activeLoop = null;
  const entity = bound?.getEntity() ?? null;
  if (entity?.anim?.playing) holdPoseAt(entity, readEditorAnimationTime());
}

function runLoop(opts: StartSubjectLoopOpts, token: number): boolean {
  const binding = bound;
  const entity = binding?.getEntity() ?? null;
  const anim = entity?.anim;
  const layer = anim?.baseLayer;
  if (!binding || !anim || !layer) return false;

  const speed = Math.max(opts.speed, 0.01);
  layer.play(opts.animationName);
  const clipDuration =
    layer.activeStateDuration || binding.durationFor(opts.animationName);
  const startTime = Math.min(Math.max(0, opts.startTime), clipDuration);
  const endTime =
    opts.endTime > startTime ? Math.min(opts.endTime, clipDuration) : clipDuration;
  if (!(endTime - startTime > 0)) {
    holdPoseAt(entity, startTime);
    return true;
  }

  let forward = !opts.inverse;
  anim.speed = forward ? speed : -speed;
  // PlayCanvas AnimComponentSystem only ticks layers when this is true.
  anim.playing = true;
  layer.activeStateCurrentTime = forward ? startTime : endTime;

  // Clips are assigned non-looping; the controller's state time keeps
  // advancing past the window, so wrap (or bounce) it here each frame.
  const tick = () => {
    if (token !== generation) return;
    const time = layer.activeStateCurrentTime;
    if (forward && time >= endTime) {
      if (opts.pingPong) {
        forward = false;
        anim.speed = -speed;
        layer.activeStateCurrentTime = endTime;
      } else {
        layer.activeStateCurrentTime = startTime;
      }
    } else if (!forward && time <= startTime) {
      if (opts.pingPong) {
        forward = true;
        anim.speed = speed;
        layer.activeStateCurrentTime = startTime;
      } else {
        layer.activeStateCurrentTime = endTime;
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return true;
}

function pauseAnim(entity: Entity | null): void {
  const anim = entity?.anim;
  if (!anim) return;
  anim.playing = false;
  anim.speed = 1;
  const layer = anim.baseLayer;
  if (!layer) return;
  layer.pause();
  layer.reset();
}

/** Stop advancing but keep the current clip pose at `time`. */
function holdPoseAt(entity: Entity | null, time: number): void {
  const anim = entity?.anim;
  const layer = anim?.baseLayer;
  if (!anim || !layer) return;
  anim.playing = false;
  anim.speed = 1;
  layer.pause();
  // The setter evaluates the pose immediately; draw it and its shadow.
  layer.activeStateCurrentTime = time;
  requestViewportRender({ shadows: true });
}

function waitForPlayback(
  token: number,
  waitMs: number,
): Promise<PlaySubjectAnimationResult> {
  const started = performance.now();
  return new Promise((resolve) => {
    const tick = () => {
      if (token !== generation) {
        resolve("cancelled");
        return;
      }
      if (performance.now() - started >= waitMs) {
        resolve(token === generation ? "completed" : "cancelled");
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
