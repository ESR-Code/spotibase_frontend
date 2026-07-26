import type { Entity, ShaderMaterial } from "playcanvas";
import type * as pc from "playcanvas";
import { GRID_BASE_SIZE } from "@/lib/editor/constants/default-settings";
import { useSettingsStore } from "@/lib/editor/state/settings-store";

const GRID_VS = /* glsl */ `
attribute vec3 aPosition;
attribute vec2 aUv0;
uniform mat4 matrix_model;
uniform mat4 matrix_viewProjection;
varying vec2 vUv0;

void main(void) {
  vUv0 = aUv0;
  gl_Position = matrix_viewProjection * matrix_model * vec4(aPosition, 1.0);
}
`;

const GRID_FS = /* glsl */ `
precision highp float;
varying vec2 vUv0;
uniform float uDivisions;
uniform float uMajorEvery;
uniform vec3 uLineColor;
uniform vec3 uMajorColor;
uniform float uFadeStart;
uniform float uFadeEnd;
uniform float uOpacity;

float gridLine(vec2 uv, float divisions, float thickness) {
  vec2 coord = uv * divisions;
  vec2 d = fwidth(coord);
  vec2 g = abs(fract(coord - 0.5) - 0.5) / max(d, vec2(1e-5));
  float line = 1.0 - min(min(g.x, g.y), 1.0);
  return smoothstep(0.0, thickness, line);
}

void main(void) {
  float minor = gridLine(vUv0, uDivisions, 1.2);
  float major = gridLine(vUv0, uDivisions / uMajorEvery, 1.6);

  vec3 color = mix(uLineColor, uMajorColor, clamp(major * 1.4, 0.0, 1.0));
  float lines = max(minor * 0.55, major);

  float r = length(vUv0 - 0.5) * 2.0;
  float fade = 1.0 - smoothstep(uFadeStart, uFadeEnd, r);

  float alpha = lines * fade * uOpacity;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(color, alpha);
}
`;

export type GridHandles = {
  entity: Entity;
  material: ShaderMaterial;
  applySettings: () => void;
};

export function createFadingGrid(pcModule: typeof pc): GridHandles {
  const material = new pcModule.ShaderMaterial({
    uniqueName: "editor-fading-grid",
    vertexGLSL: GRID_VS,
    fragmentGLSL: GRID_FS,
    attributes: {
      aPosition: pcModule.SEMANTIC_POSITION,
      aUv0: pcModule.SEMANTIC_TEXCOORD0,
    },
  });

  material.blendType = pcModule.BLEND_NORMAL;
  material.cull = pcModule.CULLFACE_NONE;
  material.depthWrite = false;
  material.depthTest = true;

  const entity = new pcModule.Entity("FadingGrid");
  entity.addComponent("render", {
    type: "plane",
    castShadows: false,
    receiveShadows: false,
    material,
  });
  entity.setLocalScale(GRID_BASE_SIZE, 1, GRID_BASE_SIZE);
  entity.setPosition(0, 0.002, 0);

  const applySettings = () => {
    const settings = useSettingsStore.getState();
    const line = hexToRgb(settings.gridColor);
    const major = offsetMajor(line);

    material.setParameter("uDivisions", 42);
    material.setParameter("uMajorEvery", 5);
    material.setParameter("uLineColor", line);
    material.setParameter("uMajorColor", major);
    material.setParameter("uFadeStart", 0.28);
    material.setParameter("uFadeEnd", 0.92);
    material.setParameter(
      "uOpacity",
      Math.min(1, Math.max(0.05, settings.gridOpacity)),
    );

    const scale = Math.max(0.25, settings.gridSize / GRID_BASE_SIZE);
    entity.setLocalScale(GRID_BASE_SIZE * scale, 1, GRID_BASE_SIZE * scale);
    material.update();
  };

  applySettings();

  return { entity, material, applySettings };
}

function hexToRgb(hex: string): number[] {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  const num = parseInt(full, 16);
  return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
}

function offsetMajor(rgb: number[]): number[] {
  // Slightly brighter major lines (approx +14% lightness)
  return rgb.map((c) => Math.min(1, c * 1.25 + 0.08));
}
