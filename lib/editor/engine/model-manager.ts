import type { Application, Entity } from "playcanvas";
import type * as pc from "playcanvas";
import { toast } from "sonner";
import { buildDefaultBox } from "@/lib/editor/engine/default-scene-builder";
import { useSceneStore } from "@/lib/editor/state/scene-store";

export type ModelManager = {
  loadDefault: () => Entity;
  replaceFromGlb: (file: File) => Promise<Entity | null>;
  setWireframe: (enabled: boolean) => void;
  getModelRoot: () => Entity;
};

export function createModelManager(
  app: Application,
  pcModule: typeof pc,
  modelRoot: Entity,
): ModelManager {
  const loadDefault = () => buildDefaultBox(app, pcModule, modelRoot);

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

  const replaceFromGlb = async (file: File): Promise<Entity | null> => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "glb") {
      toast.error("Unsupported format. Use .glb");
      return null;
    }

    toast.message(`Importing ${file.name}...`);

    try {
      const buffer = await file.arrayBuffer();
      const blob = new Blob([buffer], { type: "model/gltf-binary" });
      const url = URL.createObjectURL(blob);

      const asset = new pcModule.Asset(file.name, "container", { url });
      app.assets.add(asset);

      await new Promise<void>((resolve, reject) => {
        asset.ready(() => resolve());
        asset.on("error", (err: string) => reject(new Error(err)));
        app.assets.load(asset);
      });

      clearChildren(modelRoot);

      const resource = asset.resource as {
        instantiateRenderEntity: () => Entity;
      };
      const entity = resource.instantiateRenderEntity();
      const { sizeLabel, triangles } = normalizeEntity(entity, pcModule);
      modelRoot.addChild(entity);

      const wireframe = useSceneStore.getState().wireframe;
      if (wireframe) setWireframe(true);

      useSceneStore.getState().setModelMeta(file.name, sizeLabel);
      useSceneStore
        .getState()
        .setStats(useSceneStore.getState().fps, triangles);
      toast.success(`Imported ${file.name}`);

      URL.revokeObjectURL(url);
      return entity;
    } catch (error) {
      console.error(error);
      toast.error("Failed to load model");
      return null;
    }
  };

  return {
    loadDefault,
    replaceFromGlb,
    setWireframe,
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
