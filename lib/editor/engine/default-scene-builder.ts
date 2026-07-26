import type { Application, Entity } from "playcanvas";
import type * as pc from "playcanvas";
import { useSceneStore } from "@/lib/editor/state/scene-store";

/** Build a single default box as the starter scene model. */
export function buildDefaultBox(
  app: Application,
  pcModule: typeof pc,
  modelRoot: Entity,
): Entity {
  clearChildren(modelRoot);

  const box = new pcModule.Entity("DefaultBox");
  box.addComponent("render", {
    type: "box",
    castShadows: true,
    receiveShadows: true,
  });
  box.setLocalScale(2, 2, 2);
  box.setPosition(0, 1, 0);

  if (box.render?.meshInstances?.[0]) {
    const mat = new pcModule.StandardMaterial();
    // Mid-value studio material — reads well under key + fill
    mat.diffuse = new pcModule.Color(0.55, 0.6, 0.68);
    mat.metalness = 0.25;
    mat.gloss = 0.45;
    mat.useMetalness = true;
    mat.update();
    box.render.meshInstances[0].material = mat;
  }

  modelRoot.addChild(box);

  useSceneStore.getState().setModelMeta("Default_Box.glb", "2 × 2 × 2 units");
  useSceneStore.getState().setStats(useSceneStore.getState().fps, 12);

  return box;
}

function clearChildren(root: Entity) {
  const children = [...root.children];
  for (const child of children) {
    child.destroy();
  }
}
