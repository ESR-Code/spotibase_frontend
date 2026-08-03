import type { Hotspot } from "@/lib/editor/types/hotspot";
import type {
  EditorSettings,
  EnvironmentSettings,
} from "@/lib/editor/types/editor-settings";

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
  isPrimary: boolean;
  hotspots: Hotspot[];
  nextHotspotId: number;
  model: SceneModelState;
  /** Per-scene editor settings (formerly global "General Settings"). */
  settings: EditorSettings;
  /** Per-scene environment / lighting settings. */
  environment: EnvironmentSettings;
};
