import type { Entity, GraphNode, Quat, Vec3 } from "playcanvas";

export type PlaySubjectAnimationOpts = {
  animationName: string;
  inverse: boolean;
  speed: number;
};

export type PlaySubjectAnimationResult = "completed" | "cancelled";

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
  bound = binding;
}

export function unbindModelAnimation(): void {
  generation += 1;
  bound = null;
}

/** Stop playback and restore the imported bind pose. Cancels in-flight waits. */
export function resetModelAnimation(): void {
  generation += 1;
  const binding = bound;
  if (!binding) return;
  pauseAnim(binding.getEntity());
  binding.restoreBindPose();
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
  if (opts.inverse) {
    layer.activeStateCurrentTime = layer.activeStateDuration;
  }

  const duration = layer.activeStateDuration || binding.durationFor(opts.animationName);
  if (!(duration > 0)) return token === generation ? "completed" : "cancelled";

  const waitMs = (duration / speed) * 1000;
  return waitForPlayback(token, waitMs);
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
