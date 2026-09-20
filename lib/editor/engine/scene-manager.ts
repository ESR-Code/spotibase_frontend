import type { Application, Entity, Color as PcColor } from "playcanvas";
import type * as pc from "playcanvas";
import { createFadingGrid } from "@/lib/editor/engine/grid-shader";
import {
  applyShadowCatcherAppearance,
  createShadowCatcherMaterial,
} from "@/lib/editor/engine/shadow-catcher-material";
import { useEnvironmentStore } from "@/lib/editor/state/environment-store";

export type SceneHandles = {
  camera: Entity;
  modelRoot: Entity;
  hotspotRoot: Entity;
  shadowCatcher: Entity;
  grid: Entity;
  keyLight: Entity;
  fillLight: Entity;
  rimLight: Entity;
  applyEnvironment: () => void;
  applyGridVisibility: () => void;
  /**
   * Camera-fit the key-light shadow volume. No-op while the shadow map is
   * frozen (static models) so orbiting does not invalidate the cached map.
   */
  fitKeyLightShadows: (cameraDistance: number) => void;
  /**
   * Live clips → regenerate shadows every frame. No clips → capture this
   * frame then freeze (`SHADOWUPDATE_THISFRAME` → `NONE`).
   */
  applyShadowUpdateMode: (
    hasAnimations: boolean,
    cameraDistance: number,
  ) => void;
  /** Recapture a frozen shadow map after casters or the key light moved. */
  invalidateStaticShadows: () => void;
};

export function createScene(app: Application, pcModule: typeof pc): SceneHandles {
  const env = useEnvironmentStore.getState();

  // Studio-like exposure (matches reference ~1.15)
  app.scene.exposure = 1.2;
  // Keep ambient modest so key-light self-shadows on imported models stay
  // readable. The ground shadow catcher is unaffected by ambient/fill.
  app.scene.ambientLight = new pcModule.Color(0.3, 0.34, 0.42);
  app.scene.ambientLuminance = 0.2;

  const camera = new pcModule.Entity("Camera");
  camera.addComponent("camera", {
    clearColor: hexToColor(pcModule, env.bgColor),
    fov: 42,
    nearClip: 0.1,
    farClip: 200,
    toneMapping: pcModule.TONEMAP_ACES,
  });
  app.root.addChild(camera);

  // Key — warm studio key. One 2048 cascade; update mode is live only when
  // the loaded GLB has animation clips (see applyShadowUpdateMode).
  const keyLight = new pcModule.Entity("KeyLight");
  keyLight.addComponent("light", {
    type: "directional",
    color: hexToColor(pcModule, env.keyColor),
    intensity: env.keyIntensity,
    castShadows: true,
    shadowResolution: 4096,
    shadowDistance: 32,
    shadowIntensity: env.shadowIntensity,
    shadowBias: 0.04,
    // Prefer normal-offset over large constant bias (avoids acne bands / peter-panning).
    normalOffsetBias: 0.12,
    shadowType: pcModule.SHADOW_PCF3_32F,
    numCascades: 1,
  });
  applyDirectionalSpherical(keyLight, env.keyPitch, env.keyYaw, 16);
  app.root.addChild(keyLight);

  let lastShadowDistance = -1;
  let shadowsLive = true;

  const writeShadowDistance = (cameraDistance: number, force = false) => {
    if (!keyLight.light) return;
    // Cover a bit past the orbit so the hard shadowDistance cutoff never
    // appears as a seam on the ground, while staying tight for texel density.
    const next = Math.min(70, Math.max(16, cameraDistance * 2.15 + 8));
    if (!force && Math.abs(next - lastShadowDistance) < 0.5) return;
    lastShadowDistance = next;
    keyLight.light.shadowDistance = next;
  };

  const fitKeyLightShadows = (cameraDistance: number) => {
    if (!shadowsLive) return;
    writeShadowDistance(cameraDistance);
  };

  const applyShadowUpdateMode = (
    hasAnimations: boolean,
    cameraDistance: number,
  ) => {
    if (!keyLight.light) return;
    shadowsLive = hasAnimations;
    writeShadowDistance(cameraDistance, true);
    keyLight.light.shadowUpdateMode = hasAnimations
      ? pcModule.SHADOWUPDATE_REALTIME
      : pcModule.SHADOWUPDATE_THISFRAME;
  };

  const invalidateStaticShadows = () => {
    if (!keyLight.light || shadowsLive) return;
    keyLight.light.shadowUpdateMode = pcModule.SHADOWUPDATE_THISFRAME;
  };

  // Fill — cool bounce so dark sides stay readable
  const fillLight = new pcModule.Entity("FillLight");
  fillLight.addComponent("light", {
    type: "directional",
    color: hexToColor(pcModule, env.fillColor),
    intensity: env.fillIntensity,
    castShadows: false,
  });
  applyDirectionalSpherical(fillLight, env.fillPitch, env.fillYaw, 10);
  app.root.addChild(fillLight);

  // Rim — edge definition from behind (low enough not to fill interiors)
  const rimLight = new pcModule.Entity("RimLight");
  rimLight.addComponent("light", {
    type: "directional",
    color: hexToColor(pcModule, "#dce8ff"),
    intensity: 0.5,
    castShadows: false,
  });
  rimLight.setPosition(-2, 5, -10);
  rimLight.lookAt(0, 1, 0);
  app.root.addChild(rimLight);

  const fadingGrid = createFadingGrid(pcModule);
  app.root.addChild(fadingGrid.entity);

  // True shadow catcher — fully invisible plane that only darkens where a
  // directional shadow lands on it. No solid plane color, just the shadow.
  // Sits just above the grid so it composites on top of the grid lines too.
  const shadowCatcher = new pcModule.Entity("ShadowCatcher");
  shadowCatcher.addComponent("render", {
    type: "plane",
    castShadows: false,
    receiveShadows: true,
  });
  shadowCatcher.setLocalScale(80, 1, 80);
  shadowCatcher.setPosition(0, 0.006, 0);
  const shadowCatcherMaterial = createShadowCatcherMaterial(pcModule);
  applyShadowCatcherAppearance(shadowCatcherMaterial, env.shadowColor);
  if (shadowCatcher.render?.meshInstances?.[0]) {
    shadowCatcher.render.meshInstances[0].material = shadowCatcherMaterial;
  }
  app.root.addChild(shadowCatcher);

  const modelRoot = new pcModule.Entity("ModelRoot");
  app.root.addChild(modelRoot);

  const hotspotRoot = new pcModule.Entity("HotspotRoot");
  app.root.addChild(hotspotRoot);

  const applyGridVisibility = () => {
    const show = useEnvironmentStore.getState().show3dGrid;
    shadowCatcher.enabled = show;
    fadingGrid.entity.enabled = show;
    fadingGrid.applySettings();
  };

  const applyEnvironment = () => {
    const state = useEnvironmentStore.getState();
    if (camera.camera) {
      camera.camera.clearColor = hexToColor(pcModule, state.bgColor);
    }
    if (keyLight.light) {
      keyLight.light.intensity = state.keyIntensity;
      keyLight.light.color = hexToColor(pcModule, state.keyColor);
      keyLight.light.shadowIntensity = state.shadowIntensity;
      applyDirectionalSpherical(keyLight, state.keyPitch, state.keyYaw, 16);
      invalidateStaticShadows();
    }
    if (shadowCatcher.render?.meshInstances?.[0]?.material) {
      applyShadowCatcherAppearance(
        shadowCatcher.render.meshInstances[0].material as pc.StandardMaterial,
        state.shadowColor,
      );
    }
    if (fillLight.light) {
      fillLight.light.intensity = state.fillIntensity;
      fillLight.light.color = hexToColor(pcModule, state.fillColor);
      applyDirectionalSpherical(fillLight, state.fillPitch, state.fillYaw, 10);
    }
    applyGridVisibility();
  };

  applyEnvironment();
  fitKeyLightShadows(12);

  return {
    camera,
    modelRoot,
    hotspotRoot,
    shadowCatcher,
    grid: fadingGrid.entity,
    keyLight,
    fillLight,
    rimLight,
    applyEnvironment,
    applyGridVisibility,
    fitKeyLightShadows,
    applyShadowUpdateMode,
    invalidateStaticShadows,
  };
}

function applyDirectionalSpherical(
  light: Entity,
  pitchDeg: number,
  yawDeg: number,
  dist: number,
) {
  const pitch = (pitchDeg * Math.PI) / 180;
  const yaw = (yawDeg * Math.PI) / 180;
  const x = Math.cos(pitch) * Math.sin(yaw) * dist;
  const y = Math.sin(pitch) * dist;
  const z = Math.cos(pitch) * Math.cos(yaw) * dist;
  light.setPosition(x, y, z);
  light.lookAt(0, 1, 0);
}

function hexToColor(pcModule: typeof pc, hex: string): PcColor {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  const num = parseInt(full, 16);
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  return new pcModule.Color(r, g, b);
}
