import type { Application } from "playcanvas";

/** Trailing delay so animated layout (outliner width) settles before reallocating GPU buffers. */
const RESIZE_DEBOUNCE_MS = 80;

/** Cap retina backbuffer cost. `graphicsDevice.resizeCanvas` multiplies by maxPixelRatio. */
export const MAX_PIXEL_RATIO = 1.5;

export function applyMaxPixelRatio(app: Application) {
  const dpr =
    typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  app.graphicsDevice.maxPixelRatio = Math.min(dpr, MAX_PIXEL_RATIO);
}

/**
 * Keep the WebGL backbuffer in sync with the CSS-sized canvas parent.
 *
 * Important: do NOT call `app.resizeCanvas(w, h)` here. That sets inline
 * canvas style width/height, fights flex/CSS layout, and during animated
 * panel resizes (e.g. outliner collapse) reallocates GPU buffers every
 * animation frame — which can flash the scene or trigger a GPU reset.
 *
 * ResizeObserver events are trailing-debounced so a CSS width transition
 * produces one backbuffer resize after layout settles, not dozens mid-tween.
 */
export function bindViewportResize(
  app: Application,
  canvas: HTMLCanvasElement,
): () => void {
  let timer = 0;
  let lastW = 0;
  let lastH = 0;

  const syncBackbuffer = () => {
    const parent = canvas.parentElement;
    if (!parent) return;

    const width = Math.max(Math.floor(parent.clientWidth), 1);
    const height = Math.max(Math.floor(parent.clientHeight), 1);
    if (width === lastW && height === lastH) return;

    lastW = width;
    lastH = height;
    app.graphicsDevice.resizeCanvas(width, height);
  };

  const scheduleSync = () => {
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = 0;
      syncBackbuffer();
    }, RESIZE_DEBOUNCE_MS);
  };

  // CSS owns display size; clear any inline sizes PlayCanvas may have set.
  canvas.style.width = "";
  canvas.style.height = "";
  applyMaxPixelRatio(app);
  syncBackbuffer();

  const parent = canvas.parentElement;
  const ro = new ResizeObserver(scheduleSync);
  if (parent) ro.observe(parent);

  return () => {
    if (timer) window.clearTimeout(timer);
    ro.disconnect();
  };
}
