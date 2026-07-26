"use client";

import { useEffect, useRef } from "react";
import { createCameraController } from "@/lib/editor/engine/camera-controller";
import { createPlayCanvasAppAsync } from "@/lib/editor/engine/create-playcanvas-app";
import { createModelManager } from "@/lib/editor/engine/model-manager";
import { createScene } from "@/lib/editor/engine/scene-manager";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useEnvironmentStore } from "@/lib/editor/state/environment-store";
import { useSceneStore } from "@/lib/editor/state/scene-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import { useUIStore } from "@/lib/editor/state/ui-store";

export function usePlayCanvasEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let destroyed = false;
    let cleanup: (() => void) | undefined;

    const init = async () => {
      try {
        const pc = await import("playcanvas");
        const { app, destroy } = await createPlayCanvasAppAsync(canvas);
        if (destroyed) {
          destroy();
          return;
        }

        const scene = createScene(app, pc);
        const models = createModelManager(app, pc, scene.modelRoot);
        const cameraCtrl = createCameraController(app, pc, scene.camera, canvas);

        models.loadDefault();
        cameraCtrl.frameToEntity(scene.modelRoot, { storeHome: true });

        const resize = () => {
          const parent = canvas.parentElement;
          if (!parent) return;
          const width = Math.max(parent.clientWidth, 2);
          const height = Math.max(parent.clientHeight, 2);
          app.setCanvasResolution(pc.RESOLUTION_FIXED, width, height);
          app.resizeCanvas(width, height);
        };
        resize();

        const ro = new ResizeObserver(resize);
        if (canvas.parentElement) ro.observe(canvas.parentElement);

        let frameCount = 0;
        let fpsAccum = 0;
        const onUpdate = (dt: number) => {
          cameraCtrl.update(dt);
          frameCount += 1;
          fpsAccum += dt;
          if (fpsAccum >= 0.5) {
            useSceneStore
              .getState()
              .setStats(Math.round(frameCount / fpsAccum), useSceneStore.getState().triangleCount);
            frameCount = 0;
            fpsAccum = 0;
          }
        };
        app.on("update", onUpdate);

        const unsubEnv = useEnvironmentStore.subscribe(() => {
          scene.applyEnvironment();
        });
        const unsubSettings = useSettingsStore.subscribe(() => {
          scene.applyGridVisibility();
        });
        const unsubWire = useSceneStore.subscribe((state, prev) => {
          if (state.wireframe !== prev.wireframe) {
            models.setWireframe(state.wireframe);
          }
        });

        const onImportGlb = async (event: Event) => {
          const file = (event as CustomEvent<{ file: File }>).detail?.file;
          if (!file) return;
          const entity = await models.replaceFromGlb(file);
          if (entity) {
            cameraCtrl.frameToEntity(scene.modelRoot, { storeHome: true });
          }
        };
        const onResetCamera = () => cameraCtrl.resetHome();
        const onZoom = (event: Event) => {
          const delta = (event as CustomEvent<{ delta: number }>).detail?.delta ?? 0;
          cameraCtrl.nudgeZoom(delta);
        };

        window.addEventListener("editor:import-glb", onImportGlb);
        window.addEventListener("editor:reset-camera", onResetCamera);
        window.addEventListener("editor:zoom", onZoom);

        useSceneStore.getState().setEngineReady(true);
        useSceneStore.getState().setEngineError(null);
        useUIStore.getState().setLoading(false);

        if (useEditorStore.getState().hotspots.length === 0) {
          useEditorStore.getState().initDemoHotspots();
        }

        cleanup = () => {
          window.removeEventListener("editor:import-glb", onImportGlb);
          window.removeEventListener("editor:reset-camera", onResetCamera);
          window.removeEventListener("editor:zoom", onZoom);
          unsubEnv();
          unsubSettings();
          unsubWire();
          app.off("update", onUpdate);
          ro.disconnect();
          cameraCtrl.dispose();
          destroy();
        };
      } catch (error) {
        console.error(error);
        const message =
          error instanceof Error ? error.message : "Failed to initialize 3D engine";
        useSceneStore.getState().setEngineError(message);
        useUIStore.getState().setLoading(false);
      }
    };

    void init();

    return () => {
      destroyed = true;
      cleanup?.();
      useSceneStore.getState().setEngineReady(false);
    };
  }, []);

  return { canvasRef };
}
