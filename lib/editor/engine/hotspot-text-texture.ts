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

  const resolved = normalizeHotspotShape(shape);
  drawMarkerShape(ctx, size, color, resolved, resolved === "pin" && !text);

  if (text) {
    const content = markerContentCenter(size, resolved, "text");
    ctx.fillStyle = "#ffffff";
    ctx.font =
      resolved === "pin"
        ? isIcon
          ? "bold 52px sans-serif"
          : "bold 48px Manrope, sans-serif"
        : isIcon
          ? "bold 70px sans-serif"
          : "bold 64px Manrope, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, content.x, content.y);
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
    const resolved = normalizeHotspotShape(shape);
    const iconSize =
      resolved === "pin" ? 52 : resolved === "diamond" ? 50 : 70;
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

    drawMarkerShape(ctx, size, color, resolved);

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
      const content = markerContentCenter(size, resolved, "icon");
      ctx.save();
      if (resolved === "diamond") {
        ctx.beginPath();
        pathMarkerOutline(ctx, size / 2, size / 2, 4, size - 8, resolved);
        ctx.clip();
      }
      ctx.drawImage(
        img,
        content.x - iconSize / 2,
        content.y - iconSize / 2,
        iconSize,
        iconSize,
      );
      ctx.restore();
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
  pinHole = false,
) {
  const pad = shape === "pin" ? 6 : 4;
  const cx = size / 2;
  const cy = size / 2;
  const extent = size - pad * 2;

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = color;
  ctx.beginPath();
  pathMarkerOutline(ctx, cx, cy, pad, extent, shape);
  if (pinHole && shape === "pin") {
    const pin = pinMetrics(cx, pad, extent);
    ctx.moveTo(cx + pin.holeR, pin.headCy);
    ctx.arc(cx, pin.headCy, pin.holeR, 0, Math.PI * 2, true);
  }
  ctx.fill("evenodd");

  if (!pinHole) {
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 4;
    ctx.stroke();
  }
}

function markerContentCenter(
  size: number,
  shape: HotspotShape,
  kind: "text" | "icon" = "text",
) {
  if (shape === "pin") {
    const pad = 6;
    const pin = pinMetrics(size / 2, pad, size - pad * 2);
    return { x: size / 2, y: pin.headCy };
  }
  if (kind === "icon" || shape === "diamond") {
    return { x: size / 2, y: size / 2 };
  }
  return { x: size / 2, y: size / 2 + 4 };
}

function pinMetrics(_cx: number, top: number, extent: number) {
  const tipY = top + extent - 1;
  const headR = extent * 0.38;
  const headCy = top + headR + 3;
  const dist = Math.max(tipY - headCy, headR + 1);
  const a = Math.acos(Math.min(0.92, headR / dist));
  return {
    tipY,
    headR,
    holeR: headR * 0.52,
    headCy,
    leftAngle: Math.PI / 2 + a,
    rightAngle: Math.PI / 2 - a,
  };
}

/** Landmark / map-pin: circular head with a tip at the bottom. */
function pathPin(
  ctx: CanvasRenderingContext2D,
  cx: number,
  top: number,
  extent: number,
  reverse: boolean,
) {
  const { tipY, headR, headCy, leftAngle, rightAngle } = pinMetrics(
    cx,
    top,
    extent,
  );
  ctx.moveTo(cx, tipY);
  if (reverse) {
    ctx.arc(cx, headCy, headR, rightAngle, leftAngle, true);
  } else {
    ctx.arc(cx, headCy, headR, leftAngle, rightAngle, false);
  }
  ctx.closePath();
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
    case "pin": {
      pathPin(ctx, cx, pad, extent, false);
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

  if (shape === "pin") {
    pathPin(ctx, cx, cy - radius, radius * 2, reverse);
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
