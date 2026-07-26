import type { StandardMaterial } from "playcanvas";
import type * as pc from "playcanvas";

const SHADOW_CATCHER_SHADER_CHUNKS_VERSION = "2.21";

export function createShadowCatcherMaterial(pcModule: typeof pc): StandardMaterial {
  const mat = new pcModule.StandardMaterial();
  mat.diffuse = new pcModule.Color(0, 0, 0);
  mat.specular = new pcModule.Color(0, 0, 0);
  mat.useSkybox = false;
  mat.useLighting = true;
  mat.depthWrite = false;
  mat.blendType = pcModule.BLEND_MULTIPLICATIVE;
  mat.shadowCatcher = true;
  mat.shaderChunksVersion = SHADOW_CATCHER_SHADER_CHUNKS_VERSION;

  const glslChunks = mat.getShaderChunks(pcModule.SHADERLANGUAGE_GLSL);
  glslChunks.set(
    "litUserDeclarationPS",
    /* glsl */ `
      #ifdef LIT_SHADOW_CATCHER
        uniform vec3 uShadowTint;
      #endif
    `,
  );
  // litUserMainEndPS runs INSIDE main(), right after evaluateBackend() has
  // already written gl_FragColor.rgb = vec3(dShadowCatcher) (a grayscale
  // 1.0 = no shadow .. 0.0 = full shadow value). litUserCodePS, by contrast,
  // is a top-level chunk for function/global declarations and cannot contain
  // statements — using it caused a "global variable initializers must be
  // constant expressions" compile error.
  glslChunks.set(
    "litUserMainEndPS",
    /* glsl */ `
      #ifdef LIT_SHADOW_CATCHER
        float shadow = gl_FragColor.r;
        gl_FragColor.rgb = mix(uShadowTint, vec3(1.0), shadow);
      #endif
    `,
  );

  const wgslChunks = mat.getShaderChunks(pcModule.SHADERLANGUAGE_WGSL);
  wgslChunks.set(
    "litUserDeclarationPS",
    /* wgsl */ `
      #ifdef LIT_SHADOW_CATCHER
        uniform uShadowTint : vec3f;
      #endif
    `,
  );
  wgslChunks.set(
    "litUserMainEndPS",
    /* wgsl */ `
      #ifdef LIT_SHADOW_CATCHER
        let shadow = output.color.r;
        output.color = vec4f(mix(uniform.uShadowTint, vec3f(1.0), shadow), output.color.a);
      #endif
    `,
  );

  mat.update();
  return mat;
}

export function applyShadowCatcherAppearance(
  material: StandardMaterial,
  shadowColor: string,
) {
  // Final color is fully driven by the LIT_SHADOW_CATCHER override in
  // litUserMainEndPS (mix of uShadowTint <-> white by shadow amount), so only
  // the tint parameter needs updating — no shader rebuild required.
  material.setParameter("uShadowTint", hexToRgb(shadowColor));
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
