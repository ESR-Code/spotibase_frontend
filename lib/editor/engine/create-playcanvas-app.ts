import type { Application } from "playcanvas";

export type PlayCanvasApp = {
  app: Application;
  canvas: HTMLCanvasElement;
  destroy: () => void;
};

export async function createPlayCanvasAppAsync(
  canvas: HTMLCanvasElement,
): Promise<PlayCanvasApp> {
  const pc = await import("playcanvas");

  const app = new pc.Application(canvas, {
    mouse: new pc.Mouse(canvas),
    touch: new pc.TouchDevice(canvas),
    graphicsDeviceOptions: {
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    },
  });

  // FILLMODE_NONE + RESOLUTION_AUTO: CSS sizes the canvas; we sync the
  // backbuffer ourselves via bindViewportResize (see viewport-resize.ts).
  // Clear inline sizes set by setCanvasFillMode so Tailwind h/w-full wins.
  app.setCanvasFillMode(pc.FILLMODE_NONE);
  canvas.style.width = "";
  canvas.style.height = "";
  app.setCanvasResolution(pc.RESOLUTION_AUTO);
  app.start();

  const destroy = () => {
    app.destroy();
  };

  return { app, canvas, destroy };
}
