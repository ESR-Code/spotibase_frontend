"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { createCameraController } from "@/lib/editor/engine/camera-controller";
import { captureViewportPreview } from "@/lib/editor/engine/capture-viewport-preview";
import { createPlayCanvasAppAsync } from "@/lib/editor/engine/create-playcanvas-app";
import { createEffectsManager } from "@/lib/editor/engine/effects-manager";
import { createHotspotManager } from "@/lib/editor/engine/hotspot-manager";
import { createModelManager } from "@/lib/editor/engine/model-manager";
import { createPickingController } from "@/lib/editor/engine/picking-controller";
import { createScene } from "@/lib/editor/engine/scene-manager";
import { bindViewportResize } from "@/lib/editor/engine/viewport-resize";
import type { ImportSubjectDetail } from "@/lib/editor/io/import-subject";
import { getCameraModeForSceneType, getSceneType } from "@/lib/editor/scene-types/registry";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useEffectsStore } from "@/lib/editor/state/effects-store";
import { useEnvironmentStore } from "@/lib/editor/state/environment-store";
import {
  DEFAULT_MODEL_REFLECTION,
  DEFAULT_MODEL_ROTATION,
  DEFAULT_MODEL_SCALE,
  useModelStore,
} from "@/lib/editor/state/model-store";
import { usePreviewAppearanceStore } from "@/lib/editor/state/preview-appearance-store";
import { sceneSubjectCache } from "@/lib/editor/state/scene-subject-cache";
import {
  syncActiveSceneSettings,
  useScenesStore,
} from "@/lib/editor/state/scenes-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import { useUIStore } from "@/lib/editor/state/ui-store";
import type { SceneTypeId } from "@/lib/editor/types/scene-type";

function getActiveSceneType(): SceneTypeId {
  const state = useScenesStore.getState();
  return (
    state.scenes.find((s) => s.id === state.activeSceneId)?.type ?? "model"
  );
}

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
        const effectsMgr = createEffectsManager(app, pc, scene.camera);
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

        const applyScenePresentation = (type: SceneTypeId) => {
          cameraCtrl.setMode(getCameraModeForSceneType(type));
          const sections = getSceneType(type).settingsSections;
          if (type === "image" || !sections.grid) {
            scene.grid.enabled = false;
            scene.shadowCatcher.enabled = false;
          } else {
            scene.applyGridVisibility();
          }
          effectsMgr.applyEffects(type);
        };

        const initialType = getActiveSceneType();
        applyScenePresentation(initialType);
        models.loadDefault(initialType);
        cameraCtrl.frameToEntity(scene.modelRoot, { storeHome: true });

        const unbindResize = bindViewportResize(app, canvas);

        let frameCount = 0;
        let fpsAccum = 0;
        const onUpdate = (dt: number) => {
          cameraCtrl.update(dt);
          hotspotMgr.update(dt);
          if (getActiveSceneType() === "model") {
            scene.fitKeyLightShadows(cameraCtrl.getOrbitPose().distance);
          }
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
          if (getActiveSceneType() === "image") {
            scene.grid.enabled = false;
            scene.shadowCatcher.enabled = false;
          }
        });
        const unsubEffects = useEffectsStore.subscribe(() => {
          effectsMgr.applyEffects(getActiveSceneType());
        });
        const unsubSettings = useSettingsStore.subscribe(() => {
          if (getActiveSceneType() === "image") {
            scene.grid.enabled = false;
            scene.shadowCatcher.enabled = false;
          } else {
            scene.applyGridVisibility();
          }
        });
        const unsubEditor = useEditorStore.subscribe(() => {
          hotspotMgr.syncFromStore();
        });
        const unsubAppearance = usePreviewAppearanceStore.subscribe(() => {
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

        const onImportSubject = async (event: Event) => {
          const detail = (event as CustomEvent<Partial<ImportSubjectDetail>>)
            .detail;
          if (!detail?.file) return;
          const type = detail.type ?? getActiveSceneType();
          const entity = await models.replaceFromFile(detail.file, type);
          if (entity) {
            applyScenePresentation(type);
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
          const sceneType = targetScene?.type ?? "model";
          applyScenePresentation(sceneType);

          const cached = sceneSubjectCache.get(sceneId);

          if (cached && cached.kind === sceneType) {
            const entity = await models.restoreFromCache(
              cached.kind,
              cached.fileName,
              cached.buffer,
            );
            if (!entity) {
              models.loadDefault(sceneType);
            }
          } else {
            models.loadDefault(sceneType);
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

        window.addEventListener("editor:import-subject", onImportSubject);
        // Back-compat for any remaining GLB import dispatches.
        window.addEventListener("editor:import-glb", onImportSubject);
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
          window.removeEventListener("editor:import-subject", onImportSubject);
          window.removeEventListener("editor:import-glb", onImportSubject);
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
          unsubEffects();
          unsubSettings();
          unsubEditor();
          unsubAppearance();
          unsubWire();
          app.off("update", onUpdate);
          unbindResize();
          picking.dispose();
          hotspotMgr.dispose();
          effectsMgr.destroy();
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
