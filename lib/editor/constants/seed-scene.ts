import {
  cloneActionGraph,
  createDefaultActionGraph,
  createEmptyActionGraph,
} from "@/lib/editor/actions/create-action-graph";
import {
  cloneCameraResetPosition,
  cloneEditorSettings,
  cloneEffectsSettings,
  cloneEnvironmentSettings,
  cloneGeoSettings,
  DEFAULT_EDITOR_SETTINGS,
  DEFAULT_EFFECTS_SETTINGS,
  DEFAULT_ENVIRONMENT_SETTINGS,
  DEFAULT_GEO_SETTINGS,
} from "@/lib/editor/constants/default-settings";
import { DEMO_HOTSPOTS } from "@/lib/editor/constants/demo-hotspots";
import { getSceneType } from "@/lib/editor/scene-types/registry";
import {
  DEFAULT_MODEL_REFLECTION,
  DEFAULT_MODEL_ROTATION,
  DEFAULT_MODEL_SCALE,
} from "@/lib/editor/state/model-store";
import { DEFAULT_SCENE_NAME } from "@/lib/editor/theme/tokens";
import type {
  EditorSettings,
  EffectsSettings,
  EnvironmentSettings,
} from "@/lib/editor/types/editor-settings";
import {
  cloneGeoReference,
  type GeoReference,
} from "@/lib/editor/types/geo-reference";
import type { GeoSettings } from "@/lib/editor/types/geo-settings";
import type { Hotspot } from "@/lib/editor/types/hotspot";
import type { HotspotActionGraph } from "@/lib/editor/types/hotspot-action";
import type { ActionFence } from "@/lib/editor/types/action-fence";
import { cloneActionFences } from "@/lib/editor/types/action-fence";
import { cloneLayers, type SceneLayer } from "@/lib/editor/types/scene-layer";
import type { Scene, SceneModelState } from "@/lib/editor/types/scene";
import type { SceneTypeId } from "@/lib/editor/types/scene-type";

export const INITIAL_SCENE_ID = "scene-1";

export function createEmptyModelState(
  type: SceneTypeId = "model",
): SceneModelState {
  const descriptor = getSceneType(type);
  return {
    name: descriptor.emptySubjectName,
    info: descriptor.emptySubjectInfo,
    hasUserModel: false,
    scale: DEFAULT_MODEL_SCALE,
    rotation: { ...DEFAULT_MODEL_ROTATION },
    reflection: DEFAULT_MODEL_REFLECTION,
  };
}

export function buildDemoHotspots(): Hotspot[] {
  return DEMO_HOTSPOTS.map((data, index) => ({
    ...data,
    id: index + 1,
  }));
}

export function createScene(partial: {
  id: string;
  name: string;
  type: SceneTypeId;
  isPrimary?: boolean;
  hotspots?: Hotspot[];
  nextHotspotId?: number;
  startActions?: HotspotActionGraph;
  actionFences?: ActionFence[];
  model?: SceneModelState;
  settings?: EditorSettings;
  environment?: EnvironmentSettings;
  effects?: EffectsSettings;
  geo?: GeoSettings;
  layers?: SceneLayer[];
  geoReference?: GeoReference;
}): Scene {
  const hotspots = partial.hotspots ?? [];
  return {
    id: partial.id,
    name: partial.name,
    type: partial.type,
    isPrimary: partial.isPrimary ?? false,
    hotspots,
    nextHotspotId:
      partial.nextHotspotId ?? (hotspots.length > 0 ? hotspots.length + 1 : 1),
    startActions: cloneActionGraph(
      partial.startActions ?? createEmptyActionGraph(),
    ),
    actionFences: cloneActionFences(partial.actionFences),
    model: partial.model ?? createEmptyModelState(partial.type),
    settings: cloneEditorSettings(partial.settings ?? DEFAULT_EDITOR_SETTINGS),
    environment: cloneEnvironmentSettings(
      partial.environment ?? DEFAULT_ENVIRONMENT_SETTINGS,
    ),
    effects: cloneEffectsSettings(partial.effects ?? DEFAULT_EFFECTS_SETTINGS),
    geo: cloneGeoSettings(partial.geo ?? DEFAULT_GEO_SETTINGS),
    layers: cloneLayers(partial.layers),
    geoReference: cloneGeoReference(partial.geoReference),
  };
}

const seedHotspots = buildDemoHotspots();

export const SEED_SCENE: Scene = createScene({
  id: INITIAL_SCENE_ID,
  name: DEFAULT_SCENE_NAME,
  type: "model",
  isPrimary: true,
  hotspots: seedHotspots,
  nextHotspotId: seedHotspots.length + 1,
});

export function getSeedHotspots(): Hotspot[] {
  return SEED_SCENE.hotspots.map((h) => ({
    ...h,
    shape: h.shape ?? "circle",
    wick: h.wick ?? false,
    position: { ...h.position },
    blocks: [...h.blocks],
    enabled: h.enabled ?? true,
    customCameraEnabled: h.customCameraEnabled ?? false,
    customCamera: cloneCameraResetPosition(h.customCamera ?? null),
    actions: h.actions
      ? cloneActionGraph(h.actions)
      : createDefaultActionGraph(),
  }));
}

export function getSeedNextHotspotId(): number {
  return SEED_SCENE.nextHotspotId;
}
