import type { Application, CameraFrame, Entity } from "playcanvas";
import type * as pc from "playcanvas";
import { getSceneType } from "@/lib/editor/scene-types/registry";
import { useEffectsStore } from "@/lib/editor/state/effects-store";
import type { SceneTypeId } from "@/lib/editor/types/scene-type";

export type EffectsManager = {
  applyEffects: (sceneType: SceneTypeId) => void;
  destroy: () => void;
};

/**
 * Wires PlayCanvas CameraFrame SSAO for 3D scenes.
 * Disabled by default; CameraFrame is only created while AO is on so the
 * normal LDR camera path stays unchanged when the effect is off.
 */
export function createEffectsManager(
  app: Application,
  pcModule: typeof pc,
  camera: Entity,
): EffectsManager {
  let cameraFrame: CameraFrame | null = null;

  const ensureCameraFrame = () => {
    if (cameraFrame || !camera.camera) return cameraFrame;
    cameraFrame = new pcModule.CameraFrame(app, camera.camera);
    // Match the editor's existing ACES look; CameraFrame owns scene tonemap.
    cameraFrame.rendering.toneMapping = pcModule.TONEMAP_ACES;
    cameraFrame.rendering.samples = 4;
    cameraFrame.bloom.intensity = 0;
    return cameraFrame;
  };

  const tearDownCameraFrame = () => {
    if (!cameraFrame) return;
    cameraFrame.destroy();
    cameraFrame = null;
    if (camera.camera) {
      camera.camera.toneMapping = pcModule.TONEMAP_ACES;
    }
  };

  const applyEffects = (sceneType: SceneTypeId) => {
    const state = useEffectsStore.getState();
    const wantAo =
      getSceneType(sceneType).settingsSections.effects && state.aoEnabled;

    if (!wantAo) {
      tearDownCameraFrame();
      return;
    }

    const frame = ensureCameraFrame();
    if (!frame || !camera.camera) return;

    // Avoid double tonemapping: CameraFrame compose applies ACES.
    camera.camera.toneMapping = pcModule.TONEMAP_NONE;

    frame.enabled = true;
    frame.ssao.type = pcModule.SSAOTYPE_LIGHTING;
    frame.ssao.intensity = state.aoIntensity;
    frame.ssao.radius = state.aoRadius;
    frame.ssao.samples = Math.round(state.aoSamples);
    frame.ssao.power = state.aoPower;
    frame.ssao.blurEnabled = state.aoBlurEnabled;
    frame.ssao.scale = 1;
    frame.ssao.minAngle = 10;
    frame.ssao.randomize = false;
    frame.update();
  };

  const destroy = () => {
    tearDownCameraFrame();
  };

  return { applyEffects, destroy };
}
