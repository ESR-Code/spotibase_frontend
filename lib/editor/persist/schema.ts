import { z } from "zod";
import type { GeneralStyleSettings } from "@/lib/editor/types/general-style";
import type { HotspotActionGraph } from "@/lib/editor/types/hotspot-action";
import type { Scene } from "@/lib/editor/types/scene";
import type { SceneTypeId } from "@/lib/editor/types/scene-type";

/** Bump when the stored editor JSON changes shape; add a migration in `hydrate.ts`. */
export const EDITOR_SCHEMA_VERSION = 1;

/** `projects.editor_data`: project-wide editor state. */
export type ProjectEditorData = {
  schemaVersion: number;
  primarySceneId: string | null;
  appStartActions: HotspotActionGraph;
  generalStyle: GeneralStyleSettings;
  sceneExplorerEnabled: boolean;
};

/** Columns lifted out of `Scene` into `public.scenes`. */
type LiftedSceneKeys = "id" | "name" | "slug" | "type" | "thumbnailUrl" | "isPrimary";

/** `scenes.data`: the editor `Scene` minus the lifted columns. */
export type SceneData = Omit<Scene, LiftedSceneKeys> & { schemaVersion: number };

/** Row shape sent to / read from `public.scenes`. */
export type SceneRowPayload = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  type: SceneTypeId;
  thumbnail_asset_id: string | null;
  data: SceneData;
};

const vec3 = z.object({ x: z.number(), y: z.number(), z: z.number() });

const actionGraph = z
  .object({
    trigger: z.object({ position: z.object({ x: z.number(), y: z.number() }) }).passthrough(),
    nodes: z.array(z.object({ id: z.string(), type: z.string() }).passthrough()),
    edges: z.array(z.object({ id: z.string() }).passthrough()),
  })
  .passthrough();

const looseObject = z.object({}).passthrough();

/**
 * Structural check of `scenes.data`. Deep fields pass through and are
 * normalized by the editor's clone/default helpers during hydrate.
 */
export const sceneDataSchema = z
  .object({
    schemaVersion: z.literal(EDITOR_SCHEMA_VERSION),
    description: z.string().default(""),
    hotspots: z.array(
      z.object({ id: z.number().int(), position: vec3 }).passthrough(),
    ),
    nextHotspotId: z.number().int().positive(),
    startActions: actionGraph,
    legendActions: actionGraph,
    actionFences: z.array(looseObject).default([]),
    model: z
      .object({
        name: z.string(),
        info: z.string(),
        hasUserModel: z.boolean(),
        scale: z.number(),
        rotation: vec3,
        reflection: z.number(),
        subjectAssetId: z.string().nullable().default(null),
      })
      .passthrough(),
    settings: looseObject,
    environment: looseObject,
    effects: looseObject,
    geo: looseObject,
    layers: z.array(z.object({ id: z.string(), kind: z.string() }).passthrough()).default([]),
    geoReference: looseObject.optional(),
  })
  .passthrough();

export const sceneRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  sort_order: z.number().int(),
  type: z.enum(["model", "image", "geo"]),
  thumbnail_asset_id: z.string().uuid().nullable(),
  data: z.unknown(),
});

export type SceneRow = z.infer<typeof sceneRowSchema>;

export const projectEditorDataSchema = z
  .object({
    schemaVersion: z.literal(EDITOR_SCHEMA_VERSION),
    primarySceneId: z.string().nullable().default(null),
    appStartActions: actionGraph,
    generalStyle: looseObject,
    sceneExplorerEnabled: z.boolean().default(false),
  })
  .passthrough();
