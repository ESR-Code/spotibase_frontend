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
};

export function createScene(app: Application, pcModule: typeof pc): SceneHandles {
  const env = useEnvironmentStore.getState();

  // Studio-like exposure (matches reference ~1.15)
  app.scene.exposure = 1.2;
  app.scene.ambientLight = new pcModule.Color(0.42, 0.46, 0.55);
  app.scene.ambientLuminance = 0.35;

  const camera = new pcModule.Entity("Camera");
  camera.addComponent("camera", {
    clearColor: hexToColor(pcModule, env.bgMode === "color" ? env.bgColor : "#0b1424"),
    fov: 42,
    nearClip: 0.1,
    farClip: 200,
    toneMapping: pcModule.TONEMAP_ACES,
  });
  app.root.addChild(camera);

  // Key — warm studio key with soft, readable shadows
  const keyLight = new pcModule.Entity("KeyLight");
  keyLight.addComponent("light", {
    type: "directional",
    color: hexToColor(pcModule, env.keyColor),
    intensity: env.keyIntensity,
    castShadows: true,
    shadowResolution: 2048,
    shadowDistance: 40,
    shadowIntensity: env.shadowIntensity,
    shadowBias: 0.3,
    normalOffsetBias: 0.08,
    shadowType: pcModule.SHADOW_PCF5_32F,
  });
  keyLight.setPosition(7, 14, 5);
  keyLight.lookAt(0, 1, 0);
  app.root.addChild(keyLight);

  // Fill — cool bounce so dark sides stay readable
  const fillLight = new pcModule.Entity("FillLight");
  fillLight.addComponent("light", {
    type: "directional",
    color: hexToColor(pcModule, env.fillColor),
    intensity: env.fillIntensity,
    castShadows: false,
  });
  applyFillLightSpherical(fillLight, env.fillPitch, env.fillYaw);
  app.root.addChild(fillLight);

  // Rim — edge definition from behind
  const rimLight = new pcModule.Entity("RimLight");
  rimLight.addComponent("light", {
    type: "directional",
    color: hexToColor(pcModule, "#dce8ff"),
    intensity: 0.85,
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
      // CSS bp-grid shows through when alpha canvas + dark clear in grid mode
      camera.camera.clearColor =
        state.bgMode === "color"
          ? hexToColor(pcModule, state.bgColor)
          : hexToColor(pcModule, "#0b1424");
    }
    if (keyLight.light) {
      keyLight.light.intensity = state.keyIntensity;
      keyLight.light.color = hexToColor(pcModule, state.keyColor);
      keyLight.light.shadowIntensity = state.shadowIntensity;
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
      applyFillLightSpherical(fillLight, state.fillPitch, state.fillYaw);
    }
    applyGridVisibility();
  };

  applyEnvironment();

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
  };
}

function applyFillLightSpherical(light: Entity, pitchDeg: number, yawDeg: number) {
  const dist = 10;
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
