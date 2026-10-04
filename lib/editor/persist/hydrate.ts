import { createEmptyActionGraph } from "@/lib/editor/actions/create-action-graph";
import { useAssetsStore } from "@/lib/editor/assets/assets-store";
import { assetRef, type EditorAsset } from "@/lib/editor/assets/types";
import {
  DEFAULT_EDITOR_SETTINGS,
  DEFAULT_EFFECTS_SETTINGS,
  DEFAULT_ENVIRONMENT_SETTINGS,
  DEFAULT_GEO_SETTINGS,
} from "@/lib/editor/constants/default-settings";
import {
  createScene,
  newSceneId,
  SEED_SCENE,
} from "@/lib/editor/constants/seed-scene";
import {
  projectEditorDataSchema,
  sceneDataSchema,
  type SceneRow,
} from "@/lib/editor/persist/schema";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useEffectsStore } from "@/lib/editor/state/effects-store";
import { useEnvironmentStore } from "@/lib/editor/state/environment-store";
import { useGeneralSettingsStore } from "@/lib/editor/state/general-settings-store";
import { useGeoStore } from "@/lib/editor/state/geo-store";
import { useLayersStore } from "@/lib/editor/state/layers-store";
import { useModelStore } from "@/lib/editor/state/model-store";
import { sceneSubjectCache } from "@/lib/editor/state/scene-subject-cache";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import type { EditorSettings } from "@/lib/editor/types/editor-settings";
import type { GeneralStyleSettings } from "@/lib/editor/types/general-style";
import type { GeoReference } from "@/lib/editor/types/geo-reference";
import type { Hotspot } from "@/lib/editor/types/hotspot";
import type { HotspotActionGraph } from "@/lib/editor/types/hotspot-action";
import type { ActionFence } from "@/lib/editor/types/action-fence";
import type { Scene, SceneModelState } from "@/lib/editor/types/scene";
import type { SceneLayer } from "@/lib/editor/types/scene-layer";

export class ProjectLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectLoadError";
  }
}

function zodMessage(error: { issues: { path: (string | number)[]; message: string }[] }) {
  const issue = error.issues[0];
  return issue ? `${issue.path.join(".") || "data"}: ${issue.message}` : "invalid data";
}

function sceneFromRow(row: SceneRow, primarySceneId: string | null): Scene {
  const parsed = sceneDataSchema.safeParse(row.data);
  if (!parsed.success) {
    throw new ProjectLoadError(
      `Scene "${row.name}" could not be loaded (${zodMessage(parsed.error)}).`,
    );
  }
  const data = parsed.data;
  return createScene({
    id: row.id,
    name: row.name,
    slug: row.slug,
    type: row.type,
    isPrimary: row.id === primarySceneId,
    description: data.description,
    thumbnailUrl: row.thumbnail_asset_id ? assetRef(row.thumbnail_asset_id) : "",
    hotspots: data.hotspots as unknown as Hotspot[],
    nextHotspotId: data.nextHotspotId,
    startActions: data.startActions as unknown as HotspotActionGraph,
    legendActions: data.legendActions as unknown as HotspotActionGraph,
    actionFences: data.actionFences as unknown as ActionFence[],
    model: data.model as SceneModelState,
    // Older saves may miss newer fields: defaults first, stored values win.
    settings: { ...DEFAULT_EDITOR_SETTINGS, ...data.settings } as EditorSettings,
    environment: { ...DEFAULT_ENVIRONMENT_SETTINGS, ...data.environment },
    effects: { ...DEFAULT_EFFECTS_SETTINGS, ...data.effects },
    geo: { ...DEFAULT_GEO_SETTINGS, ...data.geo },
    layers: data.layers as unknown as SceneLayer[],
    geoReference: data.geoReference as GeoReference | undefined,
  });
}

/** Fresh first scene for a project that has never been saved. */
function seedScene(): Scene {
  return createScene({ ...SEED_SCENE, id: newSceneId(), slug: "", isPrimary: true });
}

/**
 * Replaces every authored editor store with the loaded project. Call before
 * the editor viewport mounts; throws `ProjectLoadError` on malformed data.
 */
export function hydrateProject(input: {
  projectId: string;
  editorData: unknown;
  sceneRows: SceneRow[];
  assets: EditorAsset[];
}) {
  let editorData = null;
  if (input.editorData != null) {
    const parsed = projectEditorDataSchema.safeParse(input.editorData);
    if (!parsed.success) {
      throw new ProjectLoadError(
        `Project settings could not be loaded (${zodMessage(parsed.error)}).`,
      );
    }
    editorData = parsed.data;
  }

  const rows = [...input.sceneRows].sort((a, b) => a.sort_order - b.sort_order);
  const primaryId =
    editorData?.primarySceneId && rows.some((r) => r.id === editorData.primarySceneId)
      ? editorData.primarySceneId
      : (rows[0]?.id ?? null);
  const scenes = rows.length > 0 ? rows.map((row) => sceneFromRow(row, primaryId)) : [seedScene()];
  const active = scenes.find((s) => s.isPrimary) ?? scenes[0]!;
  if (!active.isPrimary) active.isPrimary = true;

  useAssetsStore.getState().setProject(input.projectId, input.assets);
  sceneSubjectCache.clear();

  useScenesStore.setState({
    scenes,
    activeSceneId: active.id,
    appStartActions: editorData
      ? (editorData.appStartActions as unknown as HotspotActionGraph)
      : createEmptyActionGraph(),
  });

  const general = useGeneralSettingsStore.getState();
  general.resetStyle();
  if (editorData) {
    general.setStyle(editorData.generalStyle as Partial<GeneralStyleSettings>);
  }
  general.setSceneExplorerEnabled(editorData?.sceneExplorerEnabled ?? false);

  useEditorStore.getState().setMode("select");
  useEditorStore.getState().loadScene(active.hotspots, active.nextHotspotId);
  useModelStore.getState().hydrateFromScene(active.model);
  useSettingsStore.getState().hydrateSettings(active.settings);
  useEnvironmentStore.getState().hydrateEnvironment(active.environment);
  useEffectsStore.getState().hydrateEffects(active.effects);
  useGeoStore.getState().hydrateGeo(active.geo);
  useLayersStore.getState().hydrateLayers(active.layers);
}
