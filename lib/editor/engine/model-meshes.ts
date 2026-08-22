import type { Entity, GraphNode } from "playcanvas";
import type { ModelMeshEntry } from "@/lib/editor/state/model-store";

export type CollectedModelMesh = {
  id: string;
  name: string;
  entity: Entity;
};

function nodeName(node: GraphNode): string {
  const name = typeof node.name === "string" ? node.name.trim() : "";
  return name || "Mesh";
}

function relativePath(entity: Entity, root: Entity): string {
  const parts: string[] = [];
  let current: GraphNode | null = entity;
  while (current && current !== root) {
    parts.unshift(nodeName(current));
    current = current.parent;
  }
  return parts.join("/") || nodeName(entity);
}

/** Named renderable meshes under the 3D subject root. */
export function collectModelMeshes(modelRoot: Entity): {
  entries: ModelMeshEntry[];
  entities: CollectedModelMesh[];
} {
  const raw: { entity: Entity; path: string; name: string }[] = [];

  modelRoot.forEach((node) => {
    if (node === modelRoot) return;
    const entity = node as Entity;
    if (!entity.render?.meshInstances?.length) return;
    raw.push({
      entity,
      path: relativePath(entity, modelRoot),
      name: nodeName(entity),
    });
  });

  const pathCounts = new Map<string, number>();
  const nameCounts = new Map<string, number>();
  for (const item of raw) {
    pathCounts.set(item.path, (pathCounts.get(item.path) ?? 0) + 1);
    nameCounts.set(item.name, (nameCounts.get(item.name) ?? 0) + 1);
  }

  const seenPaths = new Map<string, number>();
  const seenNames = new Map<string, number>();
  const entities: CollectedModelMesh[] = [];

  for (const item of raw) {
    const pathIndex = seenPaths.get(item.path) ?? 0;
    seenPaths.set(item.path, pathIndex + 1);
    const id =
      (pathCounts.get(item.path) ?? 1) > 1
        ? `${item.path}#${pathIndex + 1}`
        : item.path;

    const nameIndex = seenNames.get(item.name) ?? 0;
    seenNames.set(item.name, nameIndex + 1);
    const name =
      (nameCounts.get(item.name) ?? 1) > 1
        ? `${item.name} (${nameIndex + 1})`
        : item.name;

    entities.push({ id, name, entity: item.entity });
  }

  return {
    entries: entities.map(({ id, name }) => ({ id, name })),
    entities,
  };
}
