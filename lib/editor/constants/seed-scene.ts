import { DEMO_HOTSPOTS } from "@/lib/editor/constants/demo-hotspots";
import {
  DEFAULT_MODEL_META,
  DEFAULT_MODEL_REFLECTION,
  DEFAULT_MODEL_ROTATION,
  DEFAULT_MODEL_SCALE,
} from "@/lib/editor/state/model-store";
import { DEFAULT_SCENE_NAME } from "@/lib/editor/theme/tokens";
import type { Hotspot } from "@/lib/editor/types/hotspot";
import type { Scene, SceneModelState } from "@/lib/editor/types/scene";

export const INITIAL_SCENE_ID = "scene-1";

export function createEmptyModelState(): SceneModelState {
  return {
    name: DEFAULT_MODEL_META.name,
    info: DEFAULT_MODEL_META.info,
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
  isPrimary?: boolean;
  hotspots?: Hotspot[];
  nextHotspotId?: number;
  model?: SceneModelState;
}): Scene {
  const hotspots = partial.hotspots ?? [];
  return {
    id: partial.id,
    name: partial.name,
    isPrimary: partial.isPrimary ?? false,
    hotspots,
    nextHotspotId: partial.nextHotspotId ?? (hotspots.length > 0 ? hotspots.length + 1 : 1),
    model: partial.model ?? createEmptyModelState(),
  };
}

const seedHotspots = buildDemoHotspots();

export const SEED_SCENE: Scene = createScene({
  id: INITIAL_SCENE_ID,
  name: DEFAULT_SCENE_NAME,
  isPrimary: true,
  hotspots: seedHotspots,
  nextHotspotId: seedHotspots.length + 1,
});

export function getSeedHotspots(): Hotspot[] {
  return SEED_SCENE.hotspots.map((h) => ({
    ...h,
    position: { ...h.position },
    blocks: [...h.blocks],
  }));
}

export function getSeedNextHotspotId(): number {
  return SEED_SCENE.nextHotspotId;
}
