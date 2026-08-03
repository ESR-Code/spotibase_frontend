/** Capture a downscaled JPEG data URL from the WebGL canvas for UI previews. */
export function captureViewportPreview(
  canvas: HTMLCanvasElement,
  maxWidth = 360,
): string {
  const srcW = canvas.width || canvas.clientWidth || 1;
  const srcH = canvas.height || canvas.clientHeight || 1;
  const scale = Math.min(1, maxWidth / srcW);
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));

  const offscreen = document.createElement("canvas");
  offscreen.width = w;
  offscreen.height = h;
  const ctx = offscreen.getContext("2d");
  if (!ctx) return canvas.toDataURL("image/jpeg", 0.72);

  ctx.drawImage(canvas, 0, 0, w, h);
  return offscreen.toDataURL("image/jpeg", 0.72);
}
