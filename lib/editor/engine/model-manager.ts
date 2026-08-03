import type { Application, Entity } from "playcanvas";
import type * as pc from "playcanvas";
import { toast } from "sonner";
import { buildDefaultBox } from "@/lib/editor/engine/default-scene-builder";
import {
  type ModelRotation,
  useModelStore,
} from "@/lib/editor/state/model-store";
import { sceneModelCache } from "@/lib/editor/state/scene-model-cache";
import { useScenesStore } from "@/lib/editor/state/scenes-store";

export type ModelManager = {
  loadDefault: () => Entity;
  replaceFromGlb: (file: File) => Promise<Entity | null>;
  restoreFromCache: (
    fileName: string,
    buffer: ArrayBuffer,
  ) => Promise<Entity | null>;
  unloadCurrent: () => void;
  setWireframe: (enabled: boolean) => void;
  applyTransform: (scale: number, rotation: ModelRotation) => void;
  getModelRoot: () => Entity;
};

export function createModelManager(
  app: Application,
  pcModule: typeof pc,
  modelRoot: Entity,
): ModelManager {
  const applyTransform = (scale: number, rotation: ModelRotation) => {
    modelRoot.setLocalScale(scale, scale, scale);
    modelRoot.setLocalEulerAngles(rotation.x, rotation.y, rotation.z);
  };

  const loadDefault = () => {
    const entity = buildDefaultBox(app, pcModule, modelRoot);
    const { modelScale, modelRotation } = useModelStore.getState();
    applyTransform(modelScale, modelRotation);
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

  const instantiateFromBuffer = async (
    fileName: string,
    buffer: ArrayBuffer,
    options: { resetTransform: boolean; toastOnSuccess: boolean },
  ): Promise<Entity | null> => {
    const blob = new Blob([buffer], { type: "model/gltf-binary" });
    const url = URL.createObjectURL(blob);

    try {
      const asset = new pcModule.Asset(fileName, "container", { url });
      app.assets.add(asset);

      await new Promise<void>((resolve, reject) => {
        asset.ready(() => resolve());
        asset.on("error", (err: string) => reject(new Error(err)));
        app.assets.load(asset);
      });

      clearChildren(modelRoot);
      if (options.resetTransform) {
        useModelStore.getState().resetModelTransform();
        applyTransform(1, { x: 0, y: 0, z: 0 });
      }

      const resource = asset.resource as {
        instantiateRenderEntity: () => Entity;
      };
      const entity = resource.instantiateRenderEntity();
      const { sizeLabel, triangles } = normalizeEntity(entity, pcModule);
      modelRoot.addChild(entity);

      const wireframe = useModelStore.getState().wireframe;
      if (wireframe) setWireframe(true);

      useModelStore.getState().setModelMeta(fileName, sizeLabel, true);
      useModelStore
        .getState()
        .setStats(useModelStore.getState().fps, triangles);

      if (options.toastOnSuccess) {
        toast.success(`Imported ${fileName}`);
      }

      return entity;
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const replaceFromGlb = async (file: File): Promise<Entity | null> => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "glb") {
      toast.error("Unsupported format. Use .glb");
      return null;
    }

    toast.message(`Importing ${file.name}...`);

    try {
      const buffer = await file.arrayBuffer();
      const entity = await instantiateFromBuffer(file.name, buffer, {
        resetTransform: true,
        toastOnSuccess: true,
      });
      if (entity) {
        const sceneId = useScenesStore.getState().activeSceneId;
        sceneModelCache.set(sceneId, {
          fileName: file.name,
          buffer,
        });
      }
      return entity;
    } catch (error) {
      console.error(error);
      toast.error("Failed to load model");
      return null;
    }
  };

  const restoreFromCache = async (
    fileName: string,
    buffer: ArrayBuffer,
  ): Promise<Entity | null> => {
    try {
      return await instantiateFromBuffer(fileName, buffer, {
        resetTransform: false,
        toastOnSuccess: false,
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to restore scene model");
      loadDefault();
      return null;
    }
  };

  const unloadCurrent = () => {
    clearChildren(modelRoot);
    modelRoot.setLocalScale(1, 1, 1);
    modelRoot.setLocalEulerAngles(0, 0, 0);
    useModelStore.getState().unload();
  };

  return {
    loadDefault,
    replaceFromGlb,
    restoreFromCache,
    unloadCurrent,
    setWireframe,
    applyTransform,
    getModelRoot: () => modelRoot,
  };
}

function clearChildren(root: Entity) {
  const children = [...root.children];
  for (const child of children) {
    child.destroy();
  }
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
