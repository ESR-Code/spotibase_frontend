"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { createCameraController } from "@/lib/editor/engine/camera-controller";
import { captureViewportPreview } from "@/lib/editor/engine/capture-viewport-preview";
import { createPlayCanvasAppAsync } from "@/lib/editor/engine/create-playcanvas-app";
import { createHotspotManager } from "@/lib/editor/engine/hotspot-manager";
import { createModelManager } from "@/lib/editor/engine/model-manager";
import { createPickingController } from "@/lib/editor/engine/picking-controller";
import { createScene } from "@/lib/editor/engine/scene-manager";
import { bindViewportResize } from "@/lib/editor/engine/viewport-resize";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useEnvironmentStore } from "@/lib/editor/state/environment-store";
import {
  DEFAULT_MODEL_REFLECTION,
  DEFAULT_MODEL_ROTATION,
  DEFAULT_MODEL_SCALE,
  useModelStore,
} from "@/lib/editor/state/model-store";
import { sceneModelCache } from "@/lib/editor/state/scene-model-cache";
import {
  syncActiveSceneSettings,
  useScenesStore,
} from "@/lib/editor/state/scenes-store";
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
        const hotspotMgr = createHotspotManager(
          app,
          pc,
          scene.hotspotRoot,
          scene.camera,
        );
        const picking = createPickingController(
          pc,
          canvas,
          scene.camera,
          scene.modelRoot,
          hotspotMgr,
          cameraCtrl,
        );

        models.loadDefault();
        cameraCtrl.frameToEntity(scene.modelRoot, { storeHome: true });

        const unbindResize = bindViewportResize(app, canvas);

        let frameCount = 0;
        let fpsAccum = 0;
        const onUpdate = (dt: number) => {
          cameraCtrl.update(dt);
          hotspotMgr.update(dt);
          frameCount += 1;
          fpsAccum += dt;
          if (fpsAccum >= 0.5) {
            useModelStore
              .getState()
              .setStats(
                Math.round(frameCount / fpsAccum),
                useModelStore.getState().triangleCount,
              );
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
        const unsubEditor = useEditorStore.subscribe(() => {
          hotspotMgr.syncFromStore();
        });
        const unsubWire = useModelStore.subscribe((state, prev) => {
          if (state.wireframe !== prev.wireframe) {
            models.setWireframe(state.wireframe);
          }
          if (
            state.modelScale !== prev.modelScale ||
            state.modelRotation.x !== prev.modelRotation.x ||
            state.modelRotation.y !== prev.modelRotation.y ||
            state.modelRotation.z !== prev.modelRotation.z
          ) {
            models.applyTransform(state.modelScale, state.modelRotation);
          }
          if (state.modelReflection !== prev.modelReflection) {
            models.applyReflection(state.modelReflection);
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
        const onResetCamera = () => {
          const custom = useSettingsStore.getState().resetPosition;
          if (custom) {
            cameraCtrl.animateToOrbitPose(custom);
            return;
          }
          // Recompute zoom-extents from the current (scaled) model, then animate.
          cameraCtrl.resetHome(scene.modelRoot);
        };
        const onSetResetPosition = () => {
          // Force a fresh frame so the canvas buffer is readable for the preview.
          app.render();
          const pose = cameraCtrl.getOrbitPose();
          const previewUrl = captureViewportPreview(canvas);
          useSettingsStore.getState().setSettings({
            resetPosition: {
              yaw: pose.yaw,
              pitch: pose.pitch,
              distance: pose.distance,
              target: { ...pose.target },
              previewUrl,
            },
          });
          syncActiveSceneSettings();
          toast.success("Reset view position saved");
        };
        const onSetHotspotCamera = (event: Event) => {
          const id = (event as CustomEvent<{ id: number }>).detail?.id;
          if (id == null) return;
          const hotspot = useEditorStore
            .getState()
            .hotspots.find((h) => h.id === id);
          if (!hotspot) return;

          app.render();
          const pose = cameraCtrl.getOrbitPose();
          const previewUrl = captureViewportPreview(canvas);
          useEditorStore.getState().updateHotspot(id, {
            customCamera: {
              yaw: pose.yaw,
              pitch: pose.pitch,
              distance: pose.distance,
              target: { ...pose.target },
              previewUrl,
            },
            customCameraEnabled: true,
          });
          toast.success("Hotspot camera saved");
        };
        const onZoom = (event: Event) => {
          const delta =
            (event as CustomEvent<{ delta: number }>).detail?.delta ?? 0;
          cameraCtrl.nudgeZoom(delta);
        };
        const onFocusHotspot = (event: Event) => {
          const id = (event as CustomEvent<{ id: number }>).detail?.id;
          if (id == null) return;
          const hotspot = useEditorStore
            .getState()
            .hotspots.find((h) => h.id === id);
          if (!hotspot) return;

          if (hotspot.customCameraEnabled && hotspot.customCamera) {
            cameraCtrl.animateToOrbitPose(hotspot.customCamera);
            return;
          }

          cameraCtrl.focusOnPoint(
            new pc.Vec3(
              hotspot.position.x,
              hotspot.position.y,
              hotspot.position.z,
            ),
          );
        };
        const onSceneSwitched = async (event: Event) => {
          const sceneId = (event as CustomEvent<{ sceneId: string }>).detail
            ?.sceneId;
          if (!sceneId) return;

          models.unloadCurrent();

          const targetScene = useScenesStore
            .getState()
            .scenes.find((s) => s.id === sceneId);
          const cached = sceneModelCache.get(sceneId);

          if (cached) {
            const entity = await models.restoreFromCache(
              cached.fileName,
              cached.buffer,
            );
            if (!entity) {
              models.loadDefault();
            }
          } else {
            models.loadDefault();
          }

          if (targetScene) {
            useModelStore.getState().hydrateFromScene(targetScene.model);
            models.applyTransform(
              targetScene.model.scale,
              targetScene.model.rotation,
            );
            models.applyReflection(
              targetScene.model.reflection ?? DEFAULT_MODEL_REFLECTION,
            );
          } else {
            models.applyTransform(DEFAULT_MODEL_SCALE, DEFAULT_MODEL_ROTATION);
            models.applyReflection(DEFAULT_MODEL_REFLECTION);
          }

          hotspotMgr.syncFromStore();
          // Prefer this scene's saved Reset view pose; otherwise zoom-extend
          // and store that framing as the default home for Reset view.
          const customReset = useSettingsStore.getState().resetPosition;
          if (customReset) {
            cameraCtrl.storeHomeFromEntity(scene.modelRoot);
            cameraCtrl.snapToOrbitPose(customReset);
          } else {
            cameraCtrl.frameToEntity(scene.modelRoot, { storeHome: true });
          }
        };

        window.addEventListener("editor:import-glb", onImportGlb);
        window.addEventListener("editor:reset-camera", onResetCamera);
        window.addEventListener("editor:set-reset-position", onSetResetPosition);
        window.addEventListener("editor:set-hotspot-camera", onSetHotspotCamera);
        window.addEventListener("editor:zoom", onZoom);
        window.addEventListener("editor:focus-hotspot", onFocusHotspot);
        window.addEventListener("editor:scene-switched", onSceneSwitched);

        useModelStore.getState().setEngineReady(true);
        useModelStore.getState().setEngineError(null);
        useUIStore.getState().setLoading(false);

        if (useEditorStore.getState().hotspots.length === 0) {
          useEditorStore.getState().initDemoHotspots();
        }
        hotspotMgr.syncFromStore();
        toast.success("Welcome to VectorForge — try Preview mode");

        cleanup = () => {
          window.removeEventListener("editor:import-glb", onImportGlb);
          window.removeEventListener("editor:reset-camera", onResetCamera);
          window.removeEventListener(
            "editor:set-reset-position",
            onSetResetPosition,
          );
          window.removeEventListener(
            "editor:set-hotspot-camera",
            onSetHotspotCamera,
          );
          window.removeEventListener("editor:zoom", onZoom);
          window.removeEventListener("editor:focus-hotspot", onFocusHotspot);
          window.removeEventListener("editor:scene-switched", onSceneSwitched);
          unsubEnv();
          unsubSettings();
          unsubEditor();
          unsubWire();
          app.off("update", onUpdate);
          unbindResize();
          picking.dispose();
          hotspotMgr.dispose();
          cameraCtrl.dispose();
          destroy();
        };
      } catch (error) {
        console.error(error);
        const message =
          error instanceof Error
            ? error.message
            : "Failed to initialize 3D engine";
        useModelStore.getState().setEngineError(message);
        useUIStore.getState().setLoading(false);
      }
    };

    void init();

    return () => {
      destroyed = true;
      cleanup?.();
      useModelStore.getState().setEngineReady(false);
    };
  }, []);

  return { canvasRef };
}
