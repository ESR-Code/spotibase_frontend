import type { Application, Entity, StandardMaterial, Texture } from "playcanvas";
import type * as pc from "playcanvas";
import { toast } from "@/lib/editor/toast";
import { buildDefaultBox } from "@/lib/editor/engine/default-scene-builder";
import { decodeMeshoptGlb } from "@/lib/editor/engine/glb-meshopt";
import {
  bindModelMeshQueries,
  unbindModelMeshQueries,
} from "@/lib/editor/engine/model-mesh-queries";
import { configureModelDecoders } from "@/lib/editor/engine/model-decoders";
import { createImageTexture } from "@/lib/editor/engine/hotspot-text-texture";
import {
  bindModelAnimation,
  captureBindPose,
  restoreBindPose,
  unbindModelAnimation,
} from "@/lib/editor/engine/model-animation";
import { collectContainerAnimations } from "@/lib/editor/engine/model-animations";
import {
  collectModelMeshes,
  type CollectedModelMesh,
} from "@/lib/editor/engine/model-meshes";
import {
  bindSubjectSurface,
  unbindSubjectSurface,
} from "@/lib/editor/engine/subject-surface";
import { getSceneType } from "@/lib/editor/scene-types/registry";
import {
  DEFAULT_MODEL_REFLECTION,
  type ModelRotation,
  useModelStore,
} from "@/lib/editor/state/model-store";
import { useEditorAnimPreviewStore } from "@/lib/editor/state/editor-anim-preview-store";
import { usePreviewVisibilityStore } from "@/lib/editor/state/preview-visibility-store";
import { sceneSubjectCache } from "@/lib/editor/state/scene-subject-cache";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import type { SceneTypeId } from "@/lib/editor/types/scene-type";

type MaterialBaseline = {
  material: StandardMaterial;
  gloss: number;
  specularityFactor: number;
  reflectivity: number;
};

const IMAGE_PLANE_HEIGHT = 6;

export type ModelManager = {
  loadDefault: (type?: SceneTypeId) => Entity;
  replaceFromFile: (file: File, type: SceneTypeId) => Promise<Entity | null>;
  /** @deprecated Use replaceFromFile */
  replaceFromGlb: (file: File) => Promise<Entity | null>;
  restoreFromCache: (
    kind: SceneTypeId,
    fileName: string,
    blob: Blob,
  ) => Promise<Entity | null>;
  unloadCurrent: () => void;
  /** Mark every in-flight subject load stale so it discards its result. */
  cancelPendingLoads: () => void;
  setWireframe: (enabled: boolean) => void;
  applyTransform: (
    scale: number,
    rotation: ModelRotation,
    offsetY: number,
  ) => void;
  applyReflection: (amount: number) => void;
  applyMeshVisibility: (disabledMeshIds: string[]) => void;
  getMeshes: () => CollectedModelMesh[];
  getModelRoot: () => Entity;
};

export function createModelManager(
  app: Application,
  pcModule: typeof pc,
  modelRoot: Entity,
): ModelManager {
  let materialBaselines: MaterialBaseline[] = [];
  let ownedTexture: Texture | null = null;
  let meshEntities: CollectedModelMesh[] = [];
  let containerAsset: InstanceType<typeof pcModule.Asset> | null = null;

  const releaseContainerAsset = () => {
    if (!containerAsset) return;
    const asset = containerAsset;
    containerAsset = null;
    if (app.assets.get(asset.id)) {
      app.assets.remove(asset);
    }
    asset.unload();
  };

  const applyTransform = (
    scale: number,
    rotation: ModelRotation,
    offsetY: number,
  ) => {
    modelRoot.setLocalScale(scale, scale, scale);
    modelRoot.setLocalEulerAngles(rotation.x, rotation.y, rotation.z);
    modelRoot.setLocalPosition(0, Math.max(0, offsetY), 0);
  };

  const applyMeshVisibility = (disabledMeshIds: string[]) => {
    const disabled = new Set(disabledMeshIds);
    for (const item of meshEntities) {
      const render = item.entity.render;
      if (!render) continue;
      render.enabled = !disabled.has(item.id);
    }
  };

  const clearAnimationBinding = () => {
    unbindModelAnimation();
    useModelStore.getState().setAnimations([]);
    useEditorAnimPreviewStore.getState().reset(null);
  };

  const attachModelAnimations = (entity: Entity, resource: unknown) => {
    const collected = collectContainerAnimations(resource);
    if (collected.length === 0) {
      clearAnimationBinding();
      return;
    }

    const restPose = captureBindPose(entity);
    entity.addComponent("anim", { activate: false, speed: 1 });
    const anim = entity.anim;
    if (!anim) {
      clearAnimationBinding();
      return;
    }

    for (const clip of collected) {
      anim.assignAnimation(clip.id, clip.track, undefined, 1, false);
    }
    anim.playing = false;
    const durations = new Map(
      collected.map((clip) => [clip.id, clip.duration] as const),
    );
    bindModelAnimation({
      getEntity: () => entity,
      restoreBindPose: () => restoreBindPose(restPose),
      durationFor: (animationName) => durations.get(animationName) ?? 0,
    });
    useModelStore.getState().setAnimations(
      collected.map(({ id, name, duration }) => ({ id, name, duration })),
    );
  };

  const syncMeshCatalog = () => {
    if (activeSceneType() !== "model") {
      meshEntities = [];
      unbindSubjectSurface();
      unbindModelMeshQueries();
      useModelStore.getState().setMeshes([]);
      clearAnimationBinding();
      return;
    }
    const collected = collectModelMeshes(modelRoot);
    meshEntities = collected.entities;
    // Fresh subject → fresh surface caches (Spawn Hotspot Y placement).
    const surfaceEntities = collected.entities.map((item) => item.entity);
    bindSubjectSurface({
      getMeshEntities: () => surfaceEntities,
      triangleType: pcModule.PRIMITIVE_TRIANGLES,
    });
    const entityById = new Map(
      collected.entities.map((item) => [item.id, item.entity]),
    );
    bindModelMeshQueries({ getCenter: (id) => meshCenter(entityById.get(id)) });
    applyMeshVisibility(
      usePreviewVisibilityStore.getState().disabledMeshIds,
    );
    useModelStore.getState().setMeshes(collected.entries);
  };

  const centerBox = new pcModule.BoundingBox();
  /** Cached per entity; recomputed only when its world transform changes. */
  const centerCache = new WeakMap<
    Entity,
    { matrix: Float32Array; center: { x: number; y: number; z: number } }
  >();
  /** World AABB centre of a mesh entity (follows model scale / rotation). */
  const meshCenter = (entity: Entity | undefined) => {
    const instances = entity?.render?.meshInstances;
    if (!entity || !instances?.length) return null;
    const world = entity.getWorldTransform().data;
    const cached = centerCache.get(entity);
    if (cached && cached.matrix.every((value, i) => value === world[i])) {
      return cached.center;
    }
    centerBox.copy(instances[0]!.aabb);
    for (let i = 1; i < instances.length; i++) centerBox.add(instances[i]!.aabb);
    const c = centerBox.center;
    const center = { x: c.x, y: c.y, z: c.z };
    centerCache.set(entity, { matrix: Float32Array.from(world), center });
    return center;
  };

  const destroyOwnedTexture = () => {
    if (ownedTexture) {
      ownedTexture.destroy();
      ownedTexture = null;
    }
  };

  const captureMaterialBaselines = () => {
    const baselines: MaterialBaseline[] = [];
    modelRoot.forEach((node) => {
      const render = (node as Entity).render;
      if (!render?.meshInstances) return;
      for (const mi of render.meshInstances) {
        const material = mi.material as StandardMaterial | null | undefined;
        if (!material || typeof material.update !== "function") continue;
        if (typeof material.gloss !== "number") continue;
        baselines.push({
          material,
          gloss: material.gloss,
          specularityFactor:
            typeof material.specularityFactor === "number"
              ? material.specularityFactor
              : 1,
          reflectivity:
            typeof material.reflectivity === "number"
              ? material.reflectivity
              : 1,
        });
      }
    });
    materialBaselines = baselines;
  };

  const applyReflection = (amount: number) => {
    const sceneType = activeSceneType();
    if (sceneType === "image") return;

    const t = Math.min(1, Math.max(0, amount));
    if (materialBaselines.length === 0) {
      captureMaterialBaselines();
    }
    for (const baseline of materialBaselines) {
      // GLB materials use glossInvert (gloss = roughness). For those, push
      // toward fully rough as reflection drops; otherwise scale gloss down.
      if (baseline.material.glossInvert) {
        baseline.material.gloss =
          baseline.gloss + (1 - baseline.gloss) * (1 - t);
      } else {
        baseline.material.gloss = baseline.gloss * t;
      }
      baseline.material.specularityFactor = baseline.specularityFactor * t;
      baseline.material.reflectivity = baseline.reflectivity * t;
      baseline.material.update();
    }
  };

  const syncAppearanceFromStore = () => {
    if (activeSceneType() === "image") return;
    captureMaterialBaselines();
    applyReflection(useModelStore.getState().modelReflection);
  };

  // Subject loads are async. Whatever replaces or clears the viewport content
  // (a newer load, a scene change, unload, the default box) bumps this, and an
  // older load that finishes late sees it is stale and discards its result
  // instead of mounting into the wrong scene.
  let loadSeq = 0;
  const cancelPendingLoads = () => {
    loadSeq += 1;
  };
  const beginLoad = (sceneId?: string) => {
    const seq = ++loadSeq;
    const startScene = sceneId ?? useScenesStore.getState().activeSceneId;
    return () =>
      seq !== loadSeq || useScenesStore.getState().activeSceneId !== startScene;
  };

  const loadDefaultImagePlaceholder = () => {
    cancelPendingLoads();
    clearChildren(modelRoot);
    releaseContainerAsset();
    destroyOwnedTexture();
    materialBaselines = [];
    clearAnimationBinding();

    const plane = buildImagePlane(pcModule, null, 16 / 9);
    modelRoot.addChild(plane);

    const { modelScale, modelRotation, modelOffsetY } = useModelStore.getState();
    applyTransform(modelScale, modelRotation, modelOffsetY);

    useModelStore.getState().setStats(useModelStore.getState().fps, 2);
    syncMeshCatalog();
    return plane;
  };

  const loadDefault = (type?: SceneTypeId) => {
    cancelPendingLoads();
    const sceneType = type ?? activeSceneType();
    if (getSceneType(sceneType).engine !== "playcanvas") {
      unloadCurrent();
      syncMeshCatalog();
      return modelRoot;
    }
    if (sceneType === "image") {
      return loadDefaultImagePlaceholder();
    }

    clearAnimationBinding();
    clearChildren(modelRoot);
    releaseContainerAsset();
    destroyOwnedTexture();
    const entity = buildDefaultBox(app, pcModule, modelRoot);
    const { modelScale, modelRotation, modelOffsetY } = useModelStore.getState();
    applyTransform(modelScale, modelRotation, modelOffsetY);
    syncAppearanceFromStore();
    syncMeshCatalog();
    return entity;
  };

  const setWireframe = (enabled: boolean) => {
    modelRoot.forEach((node) => {
      const render = (node as Entity).render;
      if (!render?.meshInstances) return;
      for (const mi of render.meshInstances) {
        mi.renderStyle = enabled
          ? pcModule.RENDERSTYLE_WIREFRAME
          : pcModule.RENDERSTYLE_SOLID;
      }
    });
  };

  const instantiateModelFromBuffer = async (
    fileName: string,
    buffer: ArrayBuffer,
    options: {
      resetTransform: boolean;
      toastOnSuccess: boolean;
      /** User import only. Restore must not rewrite authored name / size text. */
      updateAuthoredMeta: boolean;
      /** True once a newer load or a scene change superseded this one. */
      isStale: () => boolean;
    },
  ): Promise<Entity | null> => {
    configureModelDecoders(pcModule);
    // Meshopt (gltfpack) isn't parsed by PlayCanvas: decode it first. No-op otherwise.
    const glb = await decodeMeshoptGlb(buffer);
    const blob = new Blob([glb], { type: "model/gltf-binary" });
    const url = URL.createObjectURL(blob);
    let incoming: InstanceType<typeof pcModule.Asset> | null = null;

    try {
      incoming = new pcModule.Asset(fileName, "container", { url });
      app.assets.add(incoming);

      await new Promise<void>((resolve, reject) => {
        incoming!.ready(() => resolve());
        incoming!.on("error", (err: string) => reject(new Error(err)));
        app.assets.load(incoming!);
      });

      if (options.isStale()) {
        if (app.assets.get(incoming.id)) app.assets.remove(incoming);
        incoming.unload();
        return null;
      }

      clearAnimationBinding();
      clearChildren(modelRoot);
      releaseContainerAsset();
      destroyOwnedTexture();
      materialBaselines = [];
      if (options.resetTransform) {
        useModelStore.getState().resetModelTransform();
        useModelStore.getState().setModelReflection(DEFAULT_MODEL_REFLECTION);
        applyTransform(1, { x: 0, y: 0, z: 0 }, 0);
      }

      const resource = incoming.resource as {
        instantiateRenderEntity: () => Entity;
        animations?: unknown;
      };
      containerAsset = incoming;
      const entity = resource.instantiateRenderEntity();
      const { sizeLabel, triangles } = normalizeEntity(entity, pcModule);
      prepareImportedModelMaterials(entity, pcModule);
      modelRoot.addChild(entity);
      attachModelAnimations(entity, resource);

      const wireframe = useModelStore.getState().wireframe;
      if (wireframe) setWireframe(true);

      syncAppearanceFromStore();

      if (options.updateAuthoredMeta) {
        useModelStore.getState().setModelMeta(fileName, sizeLabel, true);
      }
      useModelStore
        .getState()
        .setStats(useModelStore.getState().fps, triangles);

      if (options.toastOnSuccess) {
        toast.success(`Imported ${fileName}`);
      }

      syncMeshCatalog();
      return entity;
    } catch (error) {
      if (incoming && incoming !== containerAsset) {
        if (app.assets.get(incoming.id)) app.assets.remove(incoming);
        incoming.unload();
      }
      throw error;
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const instantiateImageFromBuffer = async (
    fileName: string,
    buffer: ArrayBuffer,
    options: {
      resetTransform: boolean;
      toastOnSuccess: boolean;
      updateAuthoredMeta: boolean;
      isStale: () => boolean;
    },
  ): Promise<Entity | null> => {
    const mime = mimeFromFileName(fileName);
    const blob = new Blob([buffer], { type: mime });
    const url = URL.createObjectURL(blob);

    try {
      const { texture, aspect } = await createImageTexture(
        pcModule,
        app.graphicsDevice,
        url,
      );

      if (options.isStale()) {
        texture.destroy();
        return null;
      }

      clearChildren(modelRoot);
      releaseContainerAsset();
      destroyOwnedTexture();
      ownedTexture = texture;
      materialBaselines = [];
      clearAnimationBinding();

      if (options.resetTransform) {
        useModelStore.getState().resetModelTransform();
        applyTransform(1, { x: 0, y: 0, z: 0 }, 0);
      }

      const plane = buildImagePlane(pcModule, texture, aspect);
      modelRoot.addChild(plane);

      const wireframe = useModelStore.getState().wireframe;
      if (wireframe) setWireframe(true);

      const width = IMAGE_PLANE_HEIGHT * aspect;
      const sizeLabel = `${width.toFixed(1)} × ${IMAGE_PLANE_HEIGHT.toFixed(1)} units`;
      if (options.updateAuthoredMeta) {
        useModelStore.getState().setModelMeta(fileName, sizeLabel, true);
      }
      useModelStore.getState().setStats(useModelStore.getState().fps, 2);

      if (options.toastOnSuccess) {
        toast.success(`Imported ${fileName}`);
      }

      syncMeshCatalog();
      return plane;
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const replaceFromFile = async (
    file: File,
    type: SceneTypeId,
  ): Promise<Entity | null> => {
    if (getSceneType(type).engine !== "playcanvas") {
      toast.error(`${getSceneType(type).label} scenes do not import a subject file`);
      return null;
    }
    toast.message(`Importing ${file.name}...`);

    // The import belongs to the scene that was active when it started.
    const sceneId = useScenesStore.getState().activeSceneId;
    const isStale = beginLoad(sceneId);

    try {
      const buffer = await file.arrayBuffer();
      if (isStale()) {
        toast.message(
          `Import of ${file.name} cancelled: the scene changed or a newer import started`,
        );
        return null;
      }
      const entity =
        type === "image"
          ? await instantiateImageFromBuffer(file.name, buffer, {
              resetTransform: true,
              toastOnSuccess: true,
              updateAuthoredMeta: true,
              isStale,
            })
          : await instantiateModelFromBuffer(file.name, buffer, {
              resetTransform: true,
              toastOnSuccess: true,
              updateAuthoredMeta: true,
              isStale,
            });

      if (!entity && isStale()) {
        toast.message(
          `Import of ${file.name} cancelled: the scene changed or a newer import started`,
        );
      }
      if (entity) {
        sceneSubjectCache.set(sceneId, {
          kind: type,
          fileName: file.name,
          blob: file.slice(0, file.size, file.type || mimeFromFileName(file.name)),
          assetId: null,
        });
      }
      return entity;
    } catch (error) {
      console.error(error);
      toast.error(
        type === "image" ? "Failed to load image" : "Failed to load model",
      );
      return null;
    }
  };

  const replaceFromGlb = (file: File) => replaceFromFile(file, "model");

  const restoreFromCache = async (
    kind: SceneTypeId,
    fileName: string,
    blob: Blob,
  ): Promise<Entity | null> => {
    const isStale = beginLoad();
    try {
      const buffer = await blob.arrayBuffer();
      if (isStale()) return null;
      if (kind === "image") {
        return await instantiateImageFromBuffer(fileName, buffer, {
          resetTransform: false,
          toastOnSuccess: false,
          updateAuthoredMeta: false,
          isStale,
        });
      }
      return await instantiateModelFromBuffer(fileName, buffer, {
        resetTransform: false,
        toastOnSuccess: false,
        updateAuthoredMeta: false,
        isStale,
      });
    } catch (error) {
      console.error(error);
      // A superseded load must not toast or reset the newer scene's content.
      if (isStale()) return null;
      toast.error(
        kind === "image"
          ? "Failed to restore scene image"
          : "Failed to restore scene model",
      );
      loadDefault(kind);
      return null;
    }
  };

  const unloadCurrent = () => {
    cancelPendingLoads();
    clearAnimationBinding();
    clearChildren(modelRoot);
    releaseContainerAsset();
    destroyOwnedTexture();
    materialBaselines = [];
    modelRoot.setLocalScale(1, 1, 1);
    modelRoot.setLocalEulerAngles(0, 0, 0);
    modelRoot.setLocalPosition(0, 0, 0);
    // Viewport-only. Name, size text, and transform stay authored until hydrate.
    useModelStore.setState({ triangleCount: 0, meshes: [], animations: [] });
    syncMeshCatalog();
  };

  return {
    loadDefault,
    replaceFromFile,
    replaceFromGlb,
    restoreFromCache,
    unloadCurrent,
    cancelPendingLoads,
    setWireframe,
    applyTransform,
    applyReflection,
    applyMeshVisibility,
    getMeshes: () => meshEntities,
    getModelRoot: () => modelRoot,
  };
}

function activeSceneType(): SceneTypeId {
  const state = useScenesStore.getState();
  return (
    state.scenes.find((s) => s.id === state.activeSceneId)?.type ?? "model"
  );
}

function clearChildren(root: Entity) {
  const children = [...root.children];
  for (const child of children) {
    child.destroy();
  }
}

function mimeFromFileName(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return "application/octet-stream";
}

function buildImagePlane(
  pcModule: typeof pc,
  texture: Texture | null,
  aspect: number,
): Entity {
  const mat = new pcModule.StandardMaterial();
  if (texture) {
    mat.diffuseMap = texture;
    mat.emissiveMap = texture;
    mat.emissive = new pcModule.Color(1, 1, 1);
    mat.emissiveIntensity = 1;
    mat.diffuse = new pcModule.Color(1, 1, 1);
  } else {
    // Neutral placeholder when no image is imported yet.
    mat.diffuse = new pcModule.Color(0.22, 0.26, 0.32);
    mat.emissive = new pcModule.Color(0.22, 0.26, 0.32);
    mat.emissiveIntensity = 1;
  }
  mat.metalness = 0;
  mat.gloss = 0;
  mat.reflectivity = 0;
  mat.useMetalness = true;
  mat.useLighting = false;
  mat.useSkybox = false;
  mat.cull = pcModule.CULLFACE_NONE;
  mat.update();

  const plane = new pcModule.Entity(texture ? "ImagePlane" : "ImagePlaceholder");
  plane.addComponent("render", {
    type: "plane",
    castShadows: false,
    receiveShadows: false,
    material: mat,
  });

  // Default plane faces +Y; rotate so it faces +Z (frontal pan/zoom camera).
  const height = IMAGE_PLANE_HEIGHT;
  const width = height * Math.max(aspect, 0.05);
  plane.setLocalScale(width, 1, height);
  plane.setLocalEulerAngles(90, 0, 0);
  plane.setLocalPosition(0, 0, 0);

  return plane;
}

/**
 * Imported GLBs often carry AO/occlusion maps and glossy specular that
 * compete with real-time directional shadows. Nudge materials so cavity
 * shadowing (AO + key-light self-shadow) reads more clearly.
 */
function prepareImportedModelMaterials(
  entity: Entity,
  pcModule: typeof pc,
) {
  const seen = new Set<StandardMaterial>();

  entity.forEach((node) => {
    const render = (node as Entity).render;
    if (!render?.meshInstances?.length) return;

    for (const mi of render.meshInstances) {
      const material = mi.material as StandardMaterial | null | undefined;
      if (!material || typeof material.update !== "function") continue;
      if (seen.has(material)) continue;
      seen.add(material);

      if (material.aoMap) {
        // AO should darken lit recesses, not only ambient.
        // Runtime accepts boolean; generated typings expose a numeric setter.
        (material as unknown as { occludeDirect: boolean }).occludeDirect = true;
        material.occludeSpecular = pcModule.SPECOCC_AO;
        if (typeof material.aoIntensity === "number") {
          material.aoIntensity = Math.min(
            1.35,
            Math.max(material.aoIntensity, 1.1),
          );
        }
      }

      // Slightly damp extreme specular so soft self-shadows aren't bleached.
      if (
        typeof material.specularityFactor === "number" &&
        material.specularityFactor > 0.85
      ) {
        material.specularityFactor = 0.85;
      }

      material.update();
    }
  });
}

function normalizeEntity(
  entity: Entity,
  pcModule: typeof pc,
): { sizeLabel: string; triangles: number } {
  const bbox = new pcModule.BoundingBox();
  let hasMesh = false;
  let triangles = 0;

  entity.forEach((node) => {
    const render = (node as Entity).render;
    if (!render?.meshInstances?.length) return;
    for (const mi of render.meshInstances) {
      mi.castShadow = true;
      mi.receiveShadow = true;
      const mesh = mi.mesh;
      if (mesh?.primitive?.[0]?.count) {
        triangles += Math.floor(mesh.primitive[0].count / 3);
      }
      if (!hasMesh) {
        bbox.copy(mi.aabb);
        hasMesh = true;
      } else {
        bbox.add(mi.aabb);
      }
    }
  });

  if (!hasMesh) {
    return { sizeLabel: "Empty model", triangles: 0 };
  }

  const size = bbox.halfExtents.clone().mulScalar(2);
  const maxDim = Math.max(size.x, size.y, size.z, 0.0001);
  // Match reference: normalize longest axis to ~6 units
  const scale = 6 / maxDim;
  entity.setLocalScale(scale, scale, scale);

  const center = bbox.center;
  entity.setLocalPosition(
    -center.x * scale,
    -bbox.getMin().y * scale,
    -center.z * scale,
  );

  const sizeLabel = `${(size.x * scale).toFixed(1)} × ${(size.y * scale).toFixed(1)} × ${(size.z * scale).toFixed(1)} units`;
  return { sizeLabel, triangles };
}
