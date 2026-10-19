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

/** What is currently drawn for one mesh, so `sync` only touches changes. */
type AppliedHighlight = {
  key: string;
  entity: Entity;
  stroked: boolean;
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
  outlineCameraEntity: Entity | null;
  updateRenderTarget: (sceneCamera: {
    renderTarget?: { width: number; height: number } | null;
  }) => void;
};

export type MeshHighlightManager = {
  /** Apply highlights; only meshes whose style changed are touched. */
  sync: (byMeshId: MeshHighlightById) => void;
  /** Rebuild everything (original materials changed, e.g. reflection). */
  refresh: (byMeshId: MeshHighlightById) => void;
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
 *
 * Performance: `sync` is called on every hover change, so it is incremental.
 * Unchanged meshes are left alone, tinted clones are cached per (material,
 * style), and the OutlineRenderer is created once and only has its camera
 * switched off when nothing is stroked. Creating / destroying it adds and
 * removes a scene camera plus render targets, which stalled the GPU.
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
  const applied = new Map<string, AppliedHighlight>();
  /** Tinted clones by original material, then style key. Reused across hovers. */
  const tintCache = new Map<Material, Map<string, StandardMaterial>>();
  let catalog: CollectedModelMesh[] | null = null;
  let outlineRenderer: InstanceType<typeof pcModule.OutlineRenderer> | null =
    null;
  let captureLayer: Layer | null = null;
  let strokeCount = 0;
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

  const setOutlineCameraEnabled = (enabled: boolean) => {
    const cameraEntity = (outlineRenderer as AdjustableOutlineRenderer | null)
      ?.outlineCameraEntity;
    if (cameraEntity && cameraEntity.enabled !== enabled) {
      cameraEntity.enabled = enabled;
    }
  };

  const destroyTintCache = () => {
    for (const byKey of tintCache.values()) {
      for (const material of byKey.values()) material.destroy();
    }
    tintCache.clear();
  };

  const tintedClone = (
    original: StandardMaterial,
    styleKey: string,
    tint: ReturnType<typeof hexToColor>,
    amount: number,
  ) => {
    let byKey = tintCache.get(original);
    if (!byKey) {
      byKey = new Map();
      tintCache.set(original, byKey);
    }
    let tinted = byKey.get(styleKey);
    if (!tinted) {
      tinted = original.clone() as StandardMaterial;
      applyTintToClone(tinted, pcModule, tint, amount);
      byKey.set(styleKey, tinted);
    }
    return tinted;
  };

  const restoreTint = (entity: Entity) => {
    const instances = entity.render?.meshInstances ?? [];
    for (const meshInstance of instances) {
      const rec = overrides.get(meshInstance);
      if (!rec) continue;
      try {
        meshInstance.material = rec.original;
      } catch {
        // Mesh instance was destroyed with a previous model load.
      }
      overrides.delete(meshInstance);
    }
  };

  const applyTint = (
    entity: Entity,
    styleKey: string,
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
      const tinted = tintedClone(material, styleKey, tint, amount);
      meshInstance.material = tinted;
      overrides.set(meshInstance, { original: material, tinted });
    }
  };

  const removeHighlight = (record: AppliedHighlight) => {
    restoreTint(record.entity);
    if (record.stroked && outlineRenderer) {
      try {
        outlineRenderer.removeEntity(record.entity, false);
      } catch {
        // Entity was destroyed with a previous model load.
      }
      strokeCount -= 1;
    }
  };

  /** New model: old entities / materials are gone. Drop state without touching them. */
  const resetForCatalog = (meshes: CollectedModelMesh[]) => {
    if (catalog === meshes) return;
    catalog = meshes;
    for (const record of applied.values()) removeHighlight(record);
    applied.clear();
    overrides.clear();
    destroyTintCache();
    strokeCount = 0;
  };

  const styleKeyOf = (style: MeshHighlightById[string]) =>
    `${style.tintEnabled ? `${style.tintColor}/${style.tintOpacity}` : "-"}|${
      style.strokeEnabled ? `${style.strokeColor}/${style.strokeWidth}` : "-"
    }`;

  const sync = (byMeshId: MeshHighlightById) => {
    const meshes = getMeshes();
    resetForCatalog(meshes);

    // Remove highlights that ended, changed style, or whose mesh got hidden.
    const entityById = new Map(meshes.map((item) => [item.id, item.entity]));
    for (const [id, record] of applied) {
      const style = byMeshId[id];
      const entity = entityById.get(id);
      const visible = !!entity?.enabled && !!entity.render?.enabled;
      if (!style || !visible || styleKeyOf(style) !== record.key) {
        removeHighlight(record);
        applied.delete(id);
      }
    }

    // Add new / changed ones.
    let maxStrokeWidth = 1;
    for (const [id, style] of Object.entries(byMeshId)) {
      if (style.strokeEnabled) maxStrokeWidth = Math.max(maxStrokeWidth, style.strokeWidth);
      if (applied.has(id)) continue;
      const entity = entityById.get(id);
      if (!entity?.enabled || !entity.render?.enabled) continue;
      const key = styleKeyOf(style);
      if (style.tintEnabled) {
        applyTint(entity, key, hexToColor(style.tintColor), style.tintOpacity);
      }
      if (style.strokeEnabled) {
        ensureOutlineRenderer().addEntity(entity, hexToColor(style.strokeColor), false);
        strokeCount += 1;
      }
      applied.set(id, { key, entity, stroked: style.strokeEnabled });
    }

    strokeWidth = Math.min(4, Math.max(1, maxStrokeWidth));
    setOutlineCameraEnabled(strokeCount > 0);
  };

  const frameUpdate = () => {
    if (strokeCount <= 0 || !outlineRenderer) return;
    const layer = blendLayer();
    if (!layer) return;
    outlineRenderer.frameUpdate(camera, layer, false);
  };

  const destroy = () => {
    for (const record of applied.values()) removeHighlight(record);
    applied.clear();
    overrides.clear();
    destroyTintCache();
    if (outlineRenderer) {
      outlineRenderer.destroy();
      outlineRenderer = null;
    }
    strokeCount = 0;
  };

  const refresh = (byMeshId: MeshHighlightById) => {
    catalog = null; // forces resetForCatalog to drop applied state and clones
    sync(byMeshId);
  };

  return { sync, refresh, frameUpdate, destroy };
}
