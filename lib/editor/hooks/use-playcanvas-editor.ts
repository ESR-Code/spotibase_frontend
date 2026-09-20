"use client";

import { useEffect, useRef } from "react";
import { toast } from "@/lib/editor/toast";
import { createCameraController } from "@/lib/editor/engine/camera-controller";
import { captureViewportPreview } from "@/lib/editor/engine/capture-viewport-preview";
import { createPlayCanvasAppAsync } from "@/lib/editor/engine/create-playcanvas-app";
import { createEffectsManager } from "@/lib/editor/engine/effects-manager";
import { createHotspotManager } from "@/lib/editor/engine/hotspot-manager";
import { createMeshHighlightManager } from "@/lib/editor/engine/mesh-highlight-manager";
import { unbindModelAnimation, resetModelAnimation } from "@/lib/editor/engine/model-animation";
import { createModelManager } from "@/lib/editor/engine/model-manager";
import { createPickingController } from "@/lib/editor/engine/picking-controller";
import { createScene } from "@/lib/editor/engine/scene-manager";
import { bindViewportResize } from "@/lib/editor/engine/viewport-resize";
import type { ImportSubjectDetail } from "@/lib/editor/io/import-subject";
import {
  getCameraModeForSceneType,
  getSceneType,
  isPlayCanvasSceneType,
} from "@/lib/editor/scene-types/registry";
import { useAlignmentSessionStore } from "@/lib/editor/state/alignment-session-store";
import { useCoordsInspectorStore } from "@/lib/editor/state/coords-inspector-store";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import {
  useGeoPickOverlayStore,
  type ProjectedMarker,
} from "@/lib/editor/state/geo-pick-overlay-store";
import { useEffectsStore } from "@/lib/editor/state/effects-store";
import { useEnvironmentStore } from "@/lib/editor/state/environment-store";
import {
  DEFAULT_MODEL_REFLECTION,
  DEFAULT_MODEL_ROTATION,
  DEFAULT_MODEL_SCALE,
  useModelStore,
} from "@/lib/editor/state/model-store";
import { findHotspot } from "@/lib/editor/state/preview-hotspots";
import { usePreviewAppearanceStore } from "@/lib/editor/state/preview-appearance-store";
import { usePreviewMeshHighlightStore } from "@/lib/editor/state/preview-mesh-highlight-store";
import { usePreviewSpawnedHotspotsStore } from "@/lib/editor/state/preview-spawned-hotspots-store";
import { usePreviewVisibilityStore } from "@/lib/editor/state/preview-visibility-store";
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
        const meshHighlight = createMeshHighlightManager(
          app,
          pc,
          scene.camera,
          () => models.getMeshes(),
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
        const initialSceneId = useScenesStore.getState().activeSceneId;
        let loadedPlayCanvasSceneId = isPlayCanvasSceneType(initialType)
          ? initialSceneId
          : null;
        let subjectLoadToken = 0;
        let activeSceneType = initialType;

        const setEngineActive = (active: boolean) => {
          app.autoRender = active;
          if (active) app.renderNextFrame = true;
        };

        const loadPlayCanvasSubject = async (
          sceneId: string,
          sceneType: SceneTypeId,
        ) => {
          const token = ++subjectLoadToken;
          const cached = sceneSubjectCache.get(sceneId);
          if (cached && cached.kind === sceneType) {
            const entity = await models.restoreFromCache(
              cached.kind,
              cached.fileName,
              cached.blob,
            );
            if (token !== subjectLoadToken) return;
            if (!entity) models.loadDefault(sceneType);
          } else {
            models.loadDefault(sceneType);
          }
        };

        const applyStoredModelPose = () => {
          const model = useModelStore.getState();
          models.applyTransform(model.modelScale, model.modelRotation);
          models.applyReflection(
            model.modelReflection ?? DEFAULT_MODEL_REFLECTION,
          );
        };

        applyScenePresentation(initialType);
        if (isPlayCanvasSceneType(initialType)) {
          await loadPlayCanvasSubject(initialSceneId, initialType);
          setEngineActive(true);
        } else {
          models.loadDefault(initialType);
          setEngineActive(false);
        }
        if (destroyed) {
          destroy();
          return;
        }
        applyStoredModelPose();
        cameraCtrl.frameToEntity(scene.modelRoot, { storeHome: true });

        const syncKeyLightShadowMode = () => {
          scene.applyShadowUpdateMode(
            useModelStore.getState().animations.length > 0,
            cameraCtrl.getOrbitPose().distance,
          );
        };
        syncKeyLightShadowMode();

        const unbindResize = bindViewportResize(app, canvas);

        let frameCount = 0;
        let fpsAccum = 0;
        const overlayScreen = new pc.Vec3();
        const overlayWorld = new pc.Vec3();
        const overlayTo = new pc.Vec3();

        const projectOverlayMarkers = () => {
          const cam = scene.camera.camera;
          if (!cam) {
            useGeoPickOverlayStore.getState().setMarkers([]);
            return;
          }
          const session = useAlignmentSessionStore.getState();
          const inspector = useCoordsInspectorStore.getState();
          const aligning = session.open && session.phase === "align";
          const inspectOn = inspector.clickInspectEnabled;
          if (
            !aligning &&
            !(inspectOn && inspector.local) &&
            !(inspectOn && inspector.reverseLocal)
          ) {
            if (useGeoPickOverlayStore.getState().markers.length > 0) {
              useGeoPickOverlayStore.getState().setMarkers([]);
            }
            return;
          }

          const camPos = scene.camera.getPosition();
          const markers: ProjectedMarker[] = [];
          const push = (
            id: string,
            label: string,
            x: number,
            y: number,
            z: number,
            kind: ProjectedMarker["kind"],
          ) => {
            overlayWorld.set(x, y, z);
            overlayTo.sub2(overlayWorld, camPos);
            const inFront = overlayTo.dot(scene.camera.forward) > 0;
            cam.worldToScreen(overlayWorld, overlayScreen);
            markers.push({
              id,
              label,
              x: overlayScreen.x,
              y: overlayScreen.y,
              visible: inFront,
              kind,
            });
          };

          if (aligning) {
            session.points.forEach((pt, i) => {
              if (!pt.local) return;
              push(
                pt.id,
                String(i + 1),
                pt.local.x,
                pt.local.y,
                pt.local.z,
                "alignment",
              );
            });
          }
          if (inspectOn && inspector.local) {
            push(
              "inspect",
              "P",
              inspector.local.x,
              inspector.local.y,
              inspector.local.z,
              "inspect",
            );
          }
          if (inspectOn && inspector.reverseLocal) {
            push(
              "reverse",
              "G",
              inspector.reverseLocal.x,
              inspector.reverseLocal.y,
              inspector.reverseLocal.z,
              "reverse",
            );
          }
          useGeoPickOverlayStore.getState().setMarkers(markers);
        };

        const onUpdate = (dt: number) => {
          if (!isPlayCanvasSceneType(activeSceneType)) return;
          cameraCtrl.update(dt);
          hotspotMgr.update(dt);
          meshHighlight.frameUpdate();
          projectOverlayMarkers();
          if (activeSceneType === "model") {
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
        const unsubEditor = useEditorStore.subscribe((state, prev) => {
          if (
            state.hotspots === prev.hotspots &&
            state.isPreview === prev.isPreview
          ) {
            return;
          }
          hotspotMgr.syncFromStore();
        });
        const unsubAppearance = usePreviewAppearanceStore.subscribe(() => {
          hotspotMgr.syncFromStore();
        });
        const unsubSpawned = usePreviewSpawnedHotspotsStore.subscribe(() => {
          hotspotMgr.syncFromStore();
        });
        const unsubMeshVisibility = usePreviewVisibilityStore.subscribe(
          (state, prev) => {
            if (state.disabledMeshIds === prev.disabledMeshIds) return;
            models.applyMeshVisibility(state.disabledMeshIds);
            meshHighlight.sync(usePreviewMeshHighlightStore.getState().byMeshId);
            scene.invalidateStaticShadows();
          },
        );
        const unsubMeshHighlight = usePreviewMeshHighlightStore.subscribe(
          (state) => {
            meshHighlight.sync(state.byMeshId);
          },
        );
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
            scene.invalidateStaticShadows();
          }
          if (state.modelReflection !== prev.modelReflection) {
            models.applyReflection(state.modelReflection);
            meshHighlight.sync(
              usePreviewMeshHighlightStore.getState().byMeshId,
            );
          }
          if (state.meshes !== prev.meshes) {
            meshHighlight.sync(
              usePreviewMeshHighlightStore.getState().byMeshId,
            );
          }
          if (state.animations !== prev.animations) {
            syncKeyLightShadowMode();
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
            syncKeyLightShadowMode();
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
          const hotspot = findHotspot(id);
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

          resetModelAnimation();

          const targetScene = useScenesStore
            .getState()
            .scenes.find((s) => s.id === sceneId);
          const sceneType = targetScene?.type ?? "model";
          activeSceneType = sceneType;

          // Geo uses a different viewport. Keep the current PlayCanvas subject
          // so returning to this 2D/3D scene does not reload a placeholder.
          if (!isPlayCanvasSceneType(sceneType)) {
            setEngineActive(false);
            return;
          }

          setEngineActive(true);
          applyScenePresentation(sceneType);

          const sameSubject = loadedPlayCanvasSceneId === sceneId;
          if (!sameSubject) {
            models.unloadCurrent();
            await loadPlayCanvasSubject(sceneId, sceneType);
            if (destroyed) return;
            loadedPlayCanvasSceneId = sceneId;
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
          syncKeyLightShadowMode();
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
          unsubSpawned();
          unsubMeshVisibility();
          unsubMeshHighlight();
          unsubWire();
          app.off("update", onUpdate);
          unbindResize();
          picking.dispose();
          hotspotMgr.dispose();
          meshHighlight.destroy();
          effectsMgr.destroy();
          cameraCtrl.dispose();
          unbindModelAnimation();
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
      unbindModelAnimation();
      useModelStore.getState().setEngineReady(false);
      useModelStore.getState().setMeshes([]);
      useModelStore.getState().setAnimations([]);
    };
  }, []);

  return { canvasRef };
}
