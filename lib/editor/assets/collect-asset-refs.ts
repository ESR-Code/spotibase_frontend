import { assetIdFromRef } from "@/lib/editor/assets/types";
import type { Scene } from "@/lib/editor/types/scene";

export type AssetUsage = {
  sceneId: string | null;
  sceneName: string;
  /** Human label of the field, e.g. `Hotspot "Exit" · markerImage`. */
  where: string;
};

/** Raw-id fields (not `asset:` strings) that also reference assets. */
const ID_FIELDS = new Set(["subjectAssetId"]);

function describe(scene: Scene | null, path: (string | number)[]): string {
  const [head, index, ...rest] = path;
  const tail = (from: (string | number)[]) =>
    from.filter((part) => typeof part === "string").join(".");
  if (scene && head === "hotspots" && typeof index === "number") {
    const hotspot = scene.hotspots[index];
    const label = hotspot?.title?.trim() || `#${hotspot?.id ?? index + 1}`;
    return `Hotspot "${label}" · ${tail(rest) || "image"}`;
  }
  if (scene && head === "layers" && typeof index === "number") {
    const layer = scene.layers[index];
    return `Layer "${layer && "name" in layer ? layer.name : index + 1}"`;
  }
  if (head === "thumbnailUrl") return "Scene thumbnail";
  if (head === "settings" && index === "logoUrl") return "Logo";
  if (head === "model") return "Scene subject";
  return tail(path) || "Project";
}

function walk(
  value: unknown,
  path: (string | number)[],
  visit: (assetId: string, path: (string | number)[]) => void,
) {
  if (typeof value === "string") {
    const id = assetIdFromRef(value);
    if (id) visit(id, path);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => walk(item, [...path, i], visit));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (ID_FIELDS.has(key) && typeof child === "string" && child) {
        visit(child, [...path, key]);
      } else {
        walk(child, [...path, key], visit);
      }
    }
  }
}

/**
 * Every asset referenced by the project, keyed by asset id. Used for the
 * library "in use" guard and the missing-asset report.
 */
export function collectAssetRefs(input: {
  scenes: Scene[];
  project?: unknown;
}): Map<string, AssetUsage[]> {
  const refs = new Map<string, AssetUsage[]>();
  const add = (assetId: string, usage: AssetUsage) => {
    const list = refs.get(assetId);
    if (list) list.push(usage);
    else refs.set(assetId, [usage]);
  };

  for (const scene of input.scenes) {
    walk(scene, [], (assetId, path) =>
      add(assetId, {
        sceneId: scene.id,
        sceneName: scene.name,
        where: describe(scene, path),
      }),
    );
  }
  if (input.project !== undefined) {
    walk(input.project, [], (assetId, path) =>
      add(assetId, { sceneId: null, sceneName: "Project", where: describe(null, path) }),
    );
  }
  return refs;
}
