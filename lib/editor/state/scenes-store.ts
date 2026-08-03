import { create } from "zustand";
import { toast } from "sonner";
import {
  cloneEditorSettings,
  cloneEnvironmentSettings,
} from "@/lib/editor/constants/default-settings";
import {
  createEmptyModelState,
  createScene,
  INITIAL_SCENE_ID,
  SEED_SCENE,
} from "@/lib/editor/constants/seed-scene";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import {
  readEnvironmentSnapshot,
  useEnvironmentStore,
} from "@/lib/editor/state/environment-store";
import { useModelStore } from "@/lib/editor/state/model-store";
import { sceneModelCache } from "@/lib/editor/state/scene-model-cache";
import {
  readEditorSettingsSnapshot,
  useSettingsStore,
} from "@/lib/editor/state/settings-store";
import type { Scene } from "@/lib/editor/types/scene";

function snapshotCurrentIntoScene(scene: Scene): Scene {
  const editor = useEditorStore.getState();
  const model = useModelStore.getState();
  return {
    ...scene,
    hotspots: editor.hotspots.map((h) => ({
      ...h,
      position: { ...h.position },
      blocks: [...h.blocks],
    })),
    nextHotspotId: editor.nextId,
    model: {
      name: model.modelName,
      info: model.modelInfo,
      hasUserModel: model.hasUserModel,
      scale: model.modelScale,
      rotation: { ...model.modelRotation },
      reflection: model.modelReflection,
    },
    settings: readEditorSettingsSnapshot(),
    environment: readEnvironmentSnapshot(),
  };
}

function nextSceneId(scenes: Scene[]): string {
  let max = 0;
  for (const scene of scenes) {
    const match = /^scene-(\d+)$/.exec(scene.id);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `scene-${max + 1}`;
}

function defaultNewSceneName(scenes: Scene[]): string {
  return `Scene ${scenes.length + 1}`;
}

type ScenesState = {
  scenes: Scene[];
  activeSceneId: string;
  addScene: (name?: string) => string;
  removeScene: (id: string) => void;
  renameScene: (id: string, name: string) => void;
  setPrimaryScene: (id: string) => void;
  switchScene: (id: string) => void;
};

export const useScenesStore = create<ScenesState>((set, get) => ({
  scenes: [
    {
      ...SEED_SCENE,
      hotspots: SEED_SCENE.hotspots.map((h) => ({
        ...h,
        position: { ...h.position },
        blocks: [...h.blocks],
      })),
      model: { ...SEED_SCENE.model, rotation: { ...SEED_SCENE.model.rotation } },
      settings: cloneEditorSettings(SEED_SCENE.settings),
      environment: cloneEnvironmentSettings(SEED_SCENE.environment),
    },
  ],
  activeSceneId: INITIAL_SCENE_ID,

  addScene: (name) => {
    const state = get();
    const snapshotted = state.scenes.map((s) =>
      s.id === state.activeSceneId ? snapshotCurrentIntoScene(s) : s,
    );
    const primary =
      snapshotted.find((s) => s.isPrimary) ?? snapshotted[0]!;
    const id = nextSceneId(snapshotted);
    const scene = createScene({
      id,
      name: name?.trim() || defaultNewSceneName(snapshotted),
      isPrimary: false,
      model: createEmptyModelState(),
      // New scenes inherit the primary scene's settings.
      settings: primary.settings,
      environment: primary.environment,
    });
    set({ scenes: snapshotted.concat(scene) });
    return id;
  },

  removeScene: (id) => {
    const state = get();
    if (state.scenes.length <= 1) {
      toast.error("At least one scene is required");
      return;
    }
    const target = state.scenes.find((s) => s.id === id);
    if (!target) return;

    let nextActiveId = state.activeSceneId;
    if (state.activeSceneId === id) {
      const fallback =
        state.scenes.find((s) => s.isPrimary && s.id !== id) ??
        state.scenes.find((s) => s.id !== id);
      if (!fallback) return;
      nextActiveId = fallback.id;
      get().switchScene(fallback.id);
    }

    sceneModelCache.delete(id);

    set((current) => {
      const remaining = current.scenes.filter((s) => s.id !== id);
      const needsPrimary = !remaining.some((s) => s.isPrimary);
      const activeId =
        current.activeSceneId === id ? nextActiveId : current.activeSceneId;
      return {
        scenes: remaining.map((s) =>
          needsPrimary && s.id === activeId ? { ...s, isPrimary: true } : s,
        ),
        activeSceneId: activeId,
      };
    });
  },

  renameScene: (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    set((state) => ({
      scenes: state.scenes.map((s) =>
        s.id === id ? { ...s, name: trimmed } : s,
      ),
    }));
  },

  setPrimaryScene: (id) => {
    set((state) => ({
      scenes: state.scenes.map((s) => ({
        ...s,
        isPrimary: s.id === id,
      })),
    }));
  },

  switchScene: (id) => {
    const state = get();
    if (id === state.activeSceneId) return;
    const incoming = state.scenes.find((s) => s.id === id);
    if (!incoming) return;

    const scenes = state.scenes.map((s) =>
      s.id === state.activeSceneId ? snapshotCurrentIntoScene(s) : s,
    );
    const next = scenes.find((s) => s.id === id) ?? incoming;

    set({ scenes, activeSceneId: id });
    useEditorStore.getState().loadScene(next.hotspots, next.nextHotspotId);
    useModelStore.getState().hydrateFromScene(next.model);
    useSettingsStore.getState().hydrateSettings(next.settings);
    useEnvironmentStore.getState().hydrateEnvironment(next.environment);

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("editor:scene-switched", {
          detail: { sceneId: id },
        }),
      );
    }
  },
}));

export const useActiveScene = () =>
  useScenesStore(
    (state) =>
      state.scenes.find((s) => s.id === state.activeSceneId) ?? state.scenes[0]!,
  );

export const usePrimaryScene = () =>
  useScenesStore((state) => state.scenes.find((s) => s.isPrimary) ?? null);
