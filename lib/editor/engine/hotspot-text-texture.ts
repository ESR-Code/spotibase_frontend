import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Texture } from "playcanvas";
import type * as pc from "playcanvas";
import {
  getCategoryLucideIcon,
  normalizeCategoryIcon,
} from "@/lib/editor/theme/category-icons";
import {
  DEFAULT_HOTSPOT_SHAPE,
  normalizeHotspotShape,
  type HotspotShape,
} from "@/lib/editor/types/hotspot";

/** Canvas → PlayCanvas texture for number / icon / solid-dot marker sprites. */
export function createTextTexture(
  pcModule: typeof pc,
  appGraphicsDevice: pc.GraphicsDevice,
  text: string,
  color: string,
  isIcon = false,
  shape: HotspotShape = DEFAULT_HOTSPOT_SHAPE,
): Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return new pcModule.Texture(appGraphicsDevice, { width: size, height: size });
  }

  drawMarkerShape(ctx, size, color, normalizeHotspotShape(shape));

  if (text) {
    ctx.fillStyle = "#ffffff";
    ctx.font = isIcon
      ? "bold 70px sans-serif"
      : "bold 64px Manrope, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, size / 2, size / 2 + 4);
  }

  return canvasToTexture(pcModule, appGraphicsDevice, canvas);
}

/** Lucide icon name (or legacy emoji) → PlayCanvas marker sprite. */
export function createLucideIconTexture(
  pcModule: typeof pc,
  appGraphicsDevice: pc.GraphicsDevice,
  icon: string,
  color: string,
  shape: HotspotShape = DEFAULT_HOTSPOT_SHAPE,
): Promise<Texture> {
  return new Promise((resolve, reject) => {
    const size = 128;
    const iconSize = 70;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      resolve(
        new pcModule.Texture(appGraphicsDevice, { width: size, height: size }),
      );
      return;
    }

    drawMarkerShape(ctx, size, color, normalizeHotspotShape(shape));

    const Icon = getCategoryLucideIcon(normalizeCategoryIcon(icon));
    const svgMarkup = renderToStaticMarkup(
      createElement(Icon, {
        size: iconSize,
        color: "#ffffff",
        strokeWidth: 2.4,
      }),
    );
    const svg = svgMarkup.includes("xmlns=")
      ? svgMarkup
      : svgMarkup.replace(
          "<svg",
          '<svg xmlns="http://www.w3.org/2000/svg"',
        );

    const img = new Image();
    img.onload = () => {
      const offset = (size - iconSize) / 2;
      ctx.drawImage(img, offset, offset, iconSize, iconSize);
      resolve(canvasToTexture(pcModule, appGraphicsDevice, canvas));
    };
    img.onerror = () =>
      reject(new Error(`Failed to render marker icon: ${icon}`));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

function drawMarkerShape(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  shape: HotspotShape,
) {
  const pad = 4;
  const cx = size / 2;
  const cy = size / 2;
  const extent = size - pad * 2;

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = color;
  ctx.beginPath();
  pathMarkerOutline(ctx, cx, cy, pad, extent, shape);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 4;
  ctx.stroke();
}

function pathMarkerOutline(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  pad: number,
  extent: number,
  shape: HotspotShape,
) {
  switch (shape) {
    case "square": {
      ctx.rect(pad, pad, extent, extent);
      break;
    }
    case "rounded": {
      const radius = extent * 0.22;
      roundRectPath(ctx, pad, pad, extent, extent, radius);
      break;
    }
    case "diamond": {
      ctx.moveTo(cx, pad);
      ctx.lineTo(pad + extent, cy);
      ctx.lineTo(cx, pad + extent);
      ctx.lineTo(pad, cy);
      ctx.closePath();
      break;
    }
    default: {
      ctx.arc(cx, cy, extent / 2, 0, Math.PI * 2);
      break;
    }
  }
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function canvasToTexture(
  pcModule: typeof pc,
  appGraphicsDevice: pc.GraphicsDevice,
  canvas: HTMLCanvasElement,
): Texture {
  const texture = new pcModule.Texture(appGraphicsDevice, {
    width: canvas.width,
    height: canvas.height,
    format: pcModule.PIXELFORMAT_SRGBA,
    mipmaps: true,
    flipY: true,
  });
  texture.setSource(canvas);
  texture.upload();
  return texture;
}

/** Soft annular ring used for the expanding/fading pulse effect. */
export function createPulseRingTexture(
  pcModule: typeof pc,
  appGraphicsDevice: pc.GraphicsDevice,
  shape: HotspotShape = DEFAULT_HOTSPOT_SHAPE,
): Texture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return new pcModule.Texture(appGraphicsDevice, { width: size, height: size });
  }

  ctx.clearRect(0, 0, size, size);
  const resolved = normalizeHotspotShape(shape);
  const cx = size / 2;
  const cy = size / 2;
  const outer = size * 0.46;
  const inner = size * 0.38;
  const mid = (outer + inner) * 0.5;
  const stroke = size * 0.028;

  if (resolved === "circle") {
    const glow = ctx.createRadialGradient(cx, cy, inner * 0.85, cx, cy, outer);
    glow.addColorStop(0, "rgba(255,255,255,0)");
    glow.addColorStop(0.45, "rgba(255,255,255,0.15)");
    glow.addColorStop(0.72, "rgba(255,255,255,0.85)");
    glow.addColorStop(0.88, "rgba(255,255,255,0.35)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, outer, 0, Math.PI * 2);
    ctx.arc(cx, cy, inner, 0, Math.PI * 2, true);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.lineWidth = stroke;
    ctx.beginPath();
    ctx.arc(cx, cy, mid, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    drawShapedPulseRing(ctx, cx, cy, outer, inner, mid, stroke, resolved);
  }

  const texture = new pcModule.Texture(appGraphicsDevice, {
    width: size,
    height: size,
    format: pcModule.PIXELFORMAT_SRGBA,
    mipmaps: true,
    flipY: true,
  });
  texture.addressU = pcModule.ADDRESS_CLAMP_TO_EDGE;
  texture.addressV = pcModule.ADDRESS_CLAMP_TO_EDGE;
  texture.setSource(canvas);
  texture.upload();
  return texture;
}

function drawShapedPulseRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  mid: number,
  stroke: number,
  shape: Exclude<HotspotShape, "circle">,
) {
  // Soft fill between outer and inner outlines
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  pathCenteredShape(ctx, cx, cy, outer, shape);
  pathCenteredShape(ctx, cx, cy, inner, shape, true);
  ctx.fill("evenodd");

  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.lineWidth = stroke;
  ctx.beginPath();
  pathCenteredShape(ctx, cx, cy, mid, shape);
  ctx.stroke();
}

function pathCenteredShape(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  shape: Exclude<HotspotShape, "circle">,
  reverse = false,
) {
  const half = radius;
  if (shape === "square") {
    const x = cx - half;
    const y = cy - half;
    const size = half * 2;
    if (reverse) {
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + size);
      ctx.lineTo(x + size, y + size);
      ctx.lineTo(x + size, y);
      ctx.closePath();
    } else {
      ctx.rect(x, y, size, size);
    }
    return;
  }

  if (shape === "rounded") {
    const size = half * 2;
    const r = size * 0.22;
    if (reverse) {
      // Walk opposite direction for evenodd hole
      const x = cx - half;
      const y = cy - half;
      ctx.moveTo(x + r, y);
      ctx.arcTo(x, y, x, y + size, r);
      ctx.arcTo(x, y + size, x + size, y + size, r);
      ctx.arcTo(x + size, y + size, x + size, y, r);
      ctx.arcTo(x + size, y, x, y, r);
      ctx.closePath();
    } else {
      roundRectPath(ctx, cx - half, cy - half, size, size, r);
    }
    return;
  }

  // diamond
  const pts: [number, number][] = [
    [cx, cy - half],
    [cx + half, cy],
    [cx, cy + half],
    [cx - half, cy],
  ];
  const ordered = reverse ? [...pts].reverse() : pts;
  ctx.moveTo(ordered[0][0], ordered[0][1]);
  for (let i = 1; i < ordered.length; i++) {
    ctx.lineTo(ordered[i][0], ordered[i][1]);
  }
  ctx.closePath();
}

export function createImageTexture(
  pcModule: typeof pc,
  appGraphicsDevice: pc.GraphicsDevice,
  dataUrl: string,
): Promise<{ texture: Texture; aspect: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const texture = new pcModule.Texture(appGraphicsDevice, {
        width: img.width,
        height: img.height,
        format: pcModule.PIXELFORMAT_SRGBA,
        mipmaps: true,
      });
      texture.setSource(img);
      texture.upload();
      resolve({
        texture,
        aspect: img.width / Math.max(img.height, 1),
      });
    };
    img.onerror = () => reject(new Error("Failed to load marker image"));
    img.src = dataUrl;
  });
}
