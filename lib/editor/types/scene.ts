import type { Hotspot } from "@/lib/editor/types/hotspot";
import type { HotspotActionGraph } from "@/lib/editor/types/hotspot-action";
import type {
  EditorSettings,
  EffectsSettings,
  EnvironmentSettings,
} from "@/lib/editor/types/editor-settings";
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
  /** Immutable after creation — drives subject loader + camera mode. */
  type: SceneTypeId;
  isPrimary: boolean;
  hotspots: Hotspot[];
  nextHotspotId: number;
  /** Runs when this scene becomes active in Preview (after App Start). */
  startActions: HotspotActionGraph;
  model: SceneModelState;
  /** Per-scene editor settings (formerly global "General Settings"). */
  settings: EditorSettings;
  /** Per-scene environment / lighting settings. */
  environment: EnvironmentSettings;
  /** Per-scene post-processing effects (AO, etc.). */
  effects: EffectsSettings;
};
