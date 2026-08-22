import type {
  Application,
  Entity,
  Layer,
  Material,
  MeshInstance,
  StandardMaterial,
} from "playcanvas";
import type * as pc from "playcanvas";
import type { CollectedModelMesh } from "@/lib/editor/engine/model-meshes";
import type { MeshHighlightById } from "@/lib/editor/state/preview-mesh-highlight-store";

const OUTLINE_CAPTURE_LAYER = "MeshOutlineCapture";

type TintOverride = {
  original: Material;
  tinted: StandardMaterial;
};

type OutlineTarget = {
  width: number;
  height: number;
  resize: (width: number, height: number) => void;
};

type AdjustableOutlineRenderer = InstanceType<
  typeof pc.OutlineRenderer
> & {
  rt: OutlineTarget;
  tempRt: OutlineTarget;
  updateRenderTarget: (sceneCamera: {
    renderTarget?: { width: number; height: number } | null;
  }) => void;
};

export type MeshHighlightManager = {
  sync: (byMeshId: MeshHighlightById) => void;
  frameUpdate: () => void;
  destroy: () => void;
};

/**
 * Preview-only mesh highlight:
 * - Tint via cloned StandardMaterials: lerp diffuse toward the tint and
 *   drive emissive by opacity so the blend is visible on textured, dark,
 *   and metallic GLBs. Opacity 0 / tint off restores the original.
 * - Stroke via PlayCanvas OutlineRenderer, captured on a hidden layer so
 *   selected meshes are not redrawn on Immediate (which covered hotspots).
 */

function applyTintToClone(
  tinted: StandardMaterial,
  pcModule: typeof pc,
  tint: InstanceType<typeof pc.Color>,
  amount: number,
) {
  // Assign new Color values — mutating .r/.g/.b does not upload uniforms.
  const src = tinted.diffuse;
  const dr = src?.r ?? 1;
  const dg = src?.g ?? 1;
  const db = src?.b ?? 1;
  tinted.diffuse = new pcModule.Color(
    dr * (1 - amount) + tint.r * amount,
    dg * (1 - amount) + tint.g * amount,
    db * (1 - amount) + tint.b * amount,
  );

  // Uniform emissive wash. Drop any baked emissive map so opacity maps 1:1.
  tinted.emissiveMap = null;
  tinted.emissive = new pcModule.Color(tint.r, tint.g, tint.b);
  tinted.emissiveIntensity = amount;
  tinted.update();
}

export function createMeshHighlightManager(
  app: Application,
  pcModule: typeof pc,
  camera: Entity,
  getMeshes: () => CollectedModelMesh[],
): MeshHighlightManager {
  const overrides = new Map<MeshInstance, TintOverride>();
  let outlined: Entity[] = [];
  let outlineRenderer: InstanceType<typeof pcModule.OutlineRenderer> | null =
    null;
  let captureLayer: Layer | null = null;
  let strokeActive = false;
  let strokeWidth = 1;

  const hexToColor = (hex: string) => {
    const value = hex.replace("#", "");
    const num = parseInt(value, 16);
    if (!Number.isFinite(num)) return new pcModule.Color(1, 1, 1);
    return new pcModule.Color(
      ((num >> 16) & 255) / 255,
      ((num >> 8) & 255) / 255,
      (num & 255) / 255,
    );
  };

  const blendLayer = (): Layer | null => {
    return app.scene.layers.getLayerByName("Immediate");
  };

  const ensureCaptureLayer = (): Layer => {
    if (captureLayer) return captureLayer;
    const existing = app.scene.layers.getLayerByName(OUTLINE_CAPTURE_LAYER);
    if (existing) {
      captureLayer = existing;
      return existing;
    }
    const layer = new pcModule.Layer({ name: OUTLINE_CAPTURE_LAYER });
    app.scene.layers.push(layer);
    captureLayer = layer;
    return layer;
  };

  const ensureOutlineRenderer = () => {
    if (outlineRenderer) return outlineRenderer;
    outlineRenderer = new pcModule.OutlineRenderer(app, ensureCaptureLayer());

    // OutlineRenderer has a fixed kernel and no public thickness API.
    // Rendering its mask at a lower resolution widens that same kernel while
    // reducing fill cost. Patch only its target-sizing hook; all rendering,
    // skinning, morphing, and compositing remain in PlayCanvas.
    const adjustable =
      outlineRenderer as unknown as AdjustableOutlineRenderer;
    adjustable.updateRenderTarget = (sceneCamera) => {
      const fullWidth =
        sceneCamera.renderTarget?.width ?? app.graphicsDevice.width;
      const fullHeight =
        sceneCamera.renderTarget?.height ?? app.graphicsDevice.height;
      const width = Math.max(1, Math.round(fullWidth / strokeWidth));
      const height = Math.max(1, Math.round(fullHeight / strokeWidth));
      if (
        adjustable.rt.width !== width ||
        adjustable.rt.height !== height
      ) {
        adjustable.rt.resize(width, height);
        adjustable.tempRt.resize(width, height);
      }
    };
    return outlineRenderer;
  };

  const clearStroke = () => {
    if (outlineRenderer) {
      for (const entity of outlined) {
        try {
          outlineRenderer.removeEntity(entity, false);
        } catch {
          // Entity was destroyed with a previous model load.
        }
      }
    }
    outlined = [];
    strokeActive = false;
  };

  const destroyOutlineRenderer = () => {
    clearStroke();
    if (!outlineRenderer) return;
    outlineRenderer.destroy();
    outlineRenderer = null;
  };

  const clearTint = () => {
    for (const [meshInstance, rec] of overrides) {
      try {
        meshInstance.material = rec.original;
      } catch {
        // Mesh instance was destroyed with a previous model load.
      }
      rec.tinted.destroy();
    }
    overrides.clear();
  };

  const applyTint = (
    entity: Entity,
    tint: ReturnType<typeof hexToColor>,
    opacity: number,
  ) => {
    const amount = Math.min(1, Math.max(0, opacity));
    if (amount <= 0) return;
    const render = entity.render;
    if (!render?.meshInstances?.length) return;
    for (const meshInstance of render.meshInstances) {
      const material = meshInstance.material;
      if (!(material instanceof pcModule.StandardMaterial)) continue;
      if (overrides.has(meshInstance)) continue;

      const original = material;
      const tinted = material.clone() as StandardMaterial;
      applyTintToClone(tinted, pcModule, tint, amount);
      meshInstance.material = tinted;
      overrides.set(meshInstance, { original, tinted });
    }
  };

  const sync = (byMeshId: MeshHighlightById) => {
    clearStroke();
    clearTint();

    const strokeTargets: {
      entity: Entity;
      color: ReturnType<typeof hexToColor>;
    }[] = [];
    let maxStrokeWidth = 1;

    for (const item of getMeshes()) {
      const style = byMeshId[item.id];
      if (!style) continue;
      const entity = item.entity;
      if (!entity.enabled || !entity.render?.enabled) continue;
      if (style.tintEnabled) {
        applyTint(entity, hexToColor(style.tintColor), style.tintOpacity);
      }
      if (style.strokeEnabled) {
        strokeTargets.push({
          entity,
          color: hexToColor(style.strokeColor),
        });
        maxStrokeWidth = Math.max(maxStrokeWidth, style.strokeWidth);
      }
    }

    if (strokeTargets.length === 0) {
      destroyOutlineRenderer();
      return;
    }

    strokeWidth = Math.min(4, Math.max(1, maxStrokeWidth));
    const renderer = ensureOutlineRenderer();
    for (const target of strokeTargets) {
      renderer.addEntity(target.entity, target.color, false);
    }
    outlined = strokeTargets.map((target) => target.entity);
    strokeActive = true;
  };

  const frameUpdate = () => {
    if (!strokeActive || !outlineRenderer) return;
    const layer = blendLayer();
    if (!layer) return;
    outlineRenderer.frameUpdate(camera, layer, false);
  };

  const destroy = () => {
    clearStroke();
    clearTint();
    destroyOutlineRenderer();
  };

  return { sync, frameUpdate, destroy };
}
