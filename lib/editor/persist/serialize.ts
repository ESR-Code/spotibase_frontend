import { getAsset } from "@/lib/editor/assets/assets-store";
import { assetIdFromRef } from "@/lib/editor/assets/types";
import {
  EDITOR_SCHEMA_VERSION,
  type ProjectEditorData,
  type SceneData,
  type SceneRowPayload,
} from "@/lib/editor/persist/schema";
import {
  readGeneralStyleSnapshot,
  useGeneralSettingsStore,
} from "@/lib/editor/state/general-settings-store";
import { readLiveScenes, useScenesStore } from "@/lib/editor/state/scenes-store";
import type { Scene } from "@/lib/editor/types/scene";

export type SerializedProject = {
  editorData: ProjectEditorData;
  scenes: SceneRowPayload[];
};

function slugify(name: string): string {
  const base = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "scene";
}

function uniqueSlug(base: string, used: Set<string>): string {
  let slug = base;
  for (let n = 2; used.has(slug); n += 1) slug = `${base}-${n}`;
  used.add(slug);
  return slug;
}

/** Scenes that never had a slug get one; existing slugs never change. */
function assignSlugs(scenes: Scene[]): Scene[] {
  const used = new Set(scenes.map((s) => s.slug).filter(Boolean));
  return scenes.map((scene) =>
    scene.slug ? scene : { ...scene, slug: uniqueSlug(slugify(scene.name), used) },
  );
}

/** FK column: only ids that exist in the library (missing refs would fail the save). */
function libraryAssetId(ref: string): string | null {
  const id = assetIdFromRef(ref);
  return id && getAsset(id) ? id : null;
}

function sceneToData(scene: Scene): SceneData {
  const {
    id: _id,
    name: _name,
    slug: _slug,
    type: _type,
    thumbnailUrl: _thumbnailUrl,
    isPrimary: _isPrimary,
    ...rest
  } = scene;
  return { schemaVersion: EDITOR_SCHEMA_VERSION, ...rest };
}

/**
 * Reads the live editor (active scene from its stores) into the save
 * payload. Pure: does not write back to any store.
 */
export function serializeProject(): SerializedProject {
  const scenes = assignSlugs(readLiveScenes());
  const primary = scenes.find((s) => s.isPrimary) ?? scenes[0] ?? null;
  return {
    editorData: {
      schemaVersion: EDITOR_SCHEMA_VERSION,
      primarySceneId: primary?.id ?? null,
      appStartActions: useScenesStore.getState().appStartActions,
      generalStyle: readGeneralStyleSnapshot(),
      sceneExplorerEnabled: useGeneralSettingsStore.getState().sceneExplorerEnabled,
    },
    scenes: scenes.map((scene, index) => ({
      id: scene.id,
      name: scene.name,
      slug: scene.slug,
      sort_order: index,
      type: scene.type,
      thumbnail_asset_id: libraryAssetId(scene.thumbnailUrl),
      data: sceneToData(scene),
    })),
  };
}

/**
 * Dirty tracking compares authored data, not object key insertion order.
 * `{ lat, lng }` and `{ lng, lat }` are the same point.
 */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      sorted[key] = canonicalize(source[key]);
    }
    return sorted;
  }
  return value;
}

/** Stable string for dirty tracking (same authored data → same string). */
export function fingerprintProject(project: SerializedProject): string {
  return JSON.stringify(canonicalize(project));
}
