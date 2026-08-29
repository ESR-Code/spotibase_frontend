import type { Scene } from "@/lib/editor/types/scene";
import type {
  CoordVec3,
  EnuPoint,
  GeoPoint,
  GeoReference,
} from "@/lib/editor/types/geo-reference";
import { isAlignedGeoReference } from "@/lib/editor/types/geo-reference";
import { geoToWorld, normalizeGeoPoint, worldToGeo } from "@/lib/editor/coords/enu";
import { mat4TransformPoint } from "@/lib/editor/coords/mat4";
import { useScenesStore } from "@/lib/editor/state/scenes-store";

export { geoToWorld, worldToGeo, normalizeGeoPoint } from "@/lib/editor/coords/enu";

export type SceneCoordError = {
  ok: false;
  error: string;
};

export type SceneWorldResult = { ok: true; world: EnuPoint } | SceneCoordError;
export type SceneLocalResult = { ok: true; local: CoordVec3 } | SceneCoordError;
export type SceneGeoResult = { ok: true; geo: GeoPoint } | SceneCoordError;

type SceneLookupOk = {
  scene: Scene;
  ref: GeoReference & { status: "aligned" };
};
type SceneLookupErr = { ok: false; message: string };

function sceneLookup(sceneId: string): SceneLookupOk | SceneLookupErr {
  const scene = useScenesStore.getState().scenes.find((s) => s.id === sceneId);
  if (!scene) return { ok: false, message: `Scene “${sceneId}” was not found` };
  if (scene.type === "geo") {
    return {
      ok: false,
      message: "Geo Map scenes are already in geographic coordinates",
    };
  }
  const ref = scene.geoReference;
  if (!isAlignedGeoReference(ref)) {
    return {
      ok: false,
      message: ref?.error ?? "This scene is not georeferenced",
    };
  }
  const geoScene = useScenesStore
    .getState()
    .scenes.find((s) => s.id === ref.geoSceneId);
  if (!geoScene || geoScene.type !== "geo") {
    return { ok: false, message: "Referenced Geo Map scene is missing" };
  }
  return { scene, ref };
}

export function sceneToWorld(sceneId: string, local: CoordVec3): SceneWorldResult {
  const found = sceneLookup(sceneId);
  if ("message" in found) return { ok: false, error: found.message };
  return {
    ok: true,
    world: mat4TransformPoint(found.ref.transform.matrix, local),
  };
}

export function worldToScene(sceneId: string, world: EnuPoint): SceneLocalResult {
  const found = sceneLookup(sceneId);
  if ("message" in found) return { ok: false, error: found.message };
  return {
    ok: true,
    local: mat4TransformPoint(found.ref.transform.inverse, world),
  };
}

export function sceneToGeo(sceneId: string, local: CoordVec3): SceneGeoResult {
  const world = sceneToWorld(sceneId, local);
  if (!world.ok) return world;
  const found = sceneLookup(sceneId);
  if ("message" in found) return { ok: false, error: found.message };
  return { ok: true, geo: worldToGeo(world.world, found.ref.origin) };
}

export function geoToScene(
  sceneId: string,
  geo: { latitude: number; longitude: number; altitude?: number },
): SceneLocalResult {
  const found = sceneLookup(sceneId);
  if ("message" in found) return { ok: false, error: found.message };
  const world = geoToWorld(normalizeGeoPoint(geo), found.ref.origin);
  return worldToScene(sceneId, world);
}
