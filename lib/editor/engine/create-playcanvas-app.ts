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

  app.setCanvasFillMode(pc.FILLMODE_NONE);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);
  app.start();

  const destroy = () => {
    app.destroy();
  };

  return { app, canvas, destroy };
}
