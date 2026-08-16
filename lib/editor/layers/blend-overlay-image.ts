const MAX_EDGE = 2048;
const cache = new Map<string, HTMLCanvasElement>();

function cacheKey(dataUrl: string, blend: number): string {
  return `${blend.toFixed(3)}:${dataUrl.length}:${dataUrl.slice(-32)}`;
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load overlay image"));
    image.src = dataUrl;
  });
}

/**
 * Opacity map: white (opaque) in the center, fading to transparent at the
 * sides — an elliptical vignette. `blend` 0 = hard edges, 1 = strong fade.
 */
export function blendOverlayEdges(
  source: HTMLImageElement,
  blend: number,
): HTMLCanvasElement {
  const srcW = source.naturalWidth || source.width;
  const srcH = source.naturalHeight || source.height;
  const scale = Math.min(1, MAX_EDGE / Math.max(srcW, srcH, 1));
  const width = Math.max(1, Math.round(srcW * scale));
  const height = Math.max(1, Math.round(srcH * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.drawImage(source, 0, 0, width, height);
  if (blend <= 0.001) return canvas;

  ctx.globalCompositeOperation = "destination-in";
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(width / 2, height / 2);
  const inner = Math.max(0, 1 - blend);
  const gradient = ctx.createRadialGradient(0, 0, inner, 0, 0, 1);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
  return canvas;
}

export async function overlaySourceImage(
  dataUrl: string,
  blend: number,
): Promise<string | HTMLCanvasElement> {
  if (blend <= 0.001) return dataUrl;
  const key = cacheKey(dataUrl, blend);
  const cached = cache.get(key);
  if (cached) return cached;
  const image = await loadImage(dataUrl);
  const canvas = blendOverlayEdges(image, blend);
  if (cache.size > 12) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  cache.set(key, canvas);
  return canvas;
}

export function overlayContentKey(dataUrl: string, blend: number): string {
  return cacheKey(dataUrl, blend);
}
