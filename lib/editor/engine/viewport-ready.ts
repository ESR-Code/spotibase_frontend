/**
 * Set once a viewport (PlayCanvas or MapLibre) has registered its `editor:*`
 * window listeners (focus-hotspot, scene-switched, reset-camera, …). The
 * public viewer waits for it before entering Preview, so App Start actions
 * that move the camera or open a dialog are not dispatched into the void.
 */
let ready = false;
const listeners = new Set<() => void>();

export function markViewportReady(): void {
  if (ready) return;
  ready = true;
  for (const listener of [...listeners]) listener();
  listeners.clear();
}

export function resetViewportReady(): void {
  ready = false;
}

/** Calls `callback` once the viewport is ready (immediately if it already is). */
export function whenViewportReady(callback: () => void): () => void {
  if (ready) {
    callback();
    return () => {};
  }
  listeners.add(callback);
  return () => listeners.delete(callback);
}
