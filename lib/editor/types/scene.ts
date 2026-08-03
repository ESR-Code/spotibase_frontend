import type { Hotspot } from "@/lib/editor/types/hotspot";

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
};

export type Scene = {
  id: string;
  name: string;
  isPrimary: boolean;
  hotspots: Hotspot[];
  nextHotspotId: number;
  model: SceneModelState;
};
