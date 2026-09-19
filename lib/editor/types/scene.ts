import type { ActionFence } from "@/lib/editor/types/action-fence";
import type { Hotspot } from "@/lib/editor/types/hotspot";
import type { HotspotActionGraph } from "@/lib/editor/types/hotspot-action";
import type {
  EditorSettings,
  EffectsSettings,
  EnvironmentSettings,
} from "@/lib/editor/types/editor-settings";
import type { GeoReference } from "@/lib/editor/types/geo-reference";
import type { GeoSettings } from "@/lib/editor/types/geo-settings";
import type { SceneLayer } from "@/lib/editor/types/scene-layer";
import type { SceneTypeId } from "@/lib/editor/types/scene-type";

export type ModelRotation = {
  x: number;
  y: number;
  z: number;
};

export type SceneModelState = {
  name: string;
  info: string;
  hasUserModel: boolean;
  scale: number;
  rotation: ModelRotation;
  /** 0 = matte, 1 = full original material reflection/gloss. */
  reflection: number;
};

export type Scene = {
  id: string;
  name: string;
  /** Shown in Scene Explorer and the Scenes list when non-empty. */
  description: string;
  /** Data URL for Scene Explorer; empty string means no thumbnail. */
  thumbnailUrl: string;
  /** Immutable after creation — drives subject loader + camera mode. */
  type: SceneTypeId;
  isPrimary: boolean;
  hotspots: Hotspot[];
  nextHotspotId: number;
  /** Runs when this scene becomes active in Preview (after App Start). */
  startActions: HotspotActionGraph;
  /**
   * Runs when a Preview legend category is selected.
   * The Scene Actions lane is shown only while legend is enabled.
   */
  legendActions: HotspotActionGraph;
  /** Named colored frames on the Scene Actions canvas. */
  actionFences: ActionFence[];
  model: SceneModelState;
  /** Per-scene editor settings (formerly global "General Settings"). */
  settings: EditorSettings;
  /** Per-scene environment / lighting settings. */
  environment: EnvironmentSettings;
  /** Per-scene post-processing effects (AO, etc.). */
  effects: EffectsSettings;
  /** Per-scene geo map start view. Unused for PlayCanvas scenes. */
  geo: GeoSettings;
  /** Per-scene overlay layers (image overlays now; more kinds later). */
  layers: SceneLayer[];
  /**
   * Alignment of a 3D/2D scene to a Geo Map scene.
   * Absent on geo scenes and on unaligned model/image scenes.
   */
  geoReference?: GeoReference;
};
