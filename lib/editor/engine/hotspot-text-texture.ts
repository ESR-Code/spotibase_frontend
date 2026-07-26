import type { Texture } from "playcanvas";
import type * as pc from "playcanvas";

/** Canvas → PlayCanvas texture for number / icon marker sprites. */
export function createTextTexture(
  pcModule: typeof pc,
  appGraphicsDevice: pc.GraphicsDevice,
  text: string,
  color: string,
  isIcon = false,
): Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return new pcModule.Texture(appGraphicsDevice, { width: size, height: size });
  }

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = isIcon
    ? "bold 70px sans-serif"
    : "bold 64px Manrope, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, size / 2, size / 2 + 4);

  const texture = new pcModule.Texture(appGraphicsDevice, {
    width: size,
    height: size,
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
  const cx = size / 2;
  const cy = size / 2;
  const outer = size * 0.46;
  const inner = size * 0.38;

  // Soft outer glow
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

  // Crisp core stroke
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.lineWidth = size * 0.028;
  ctx.beginPath();
  ctx.arc(cx, cy, (outer + inner) * 0.5, 0, Math.PI * 2);
  ctx.stroke();

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
