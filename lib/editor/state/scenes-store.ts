import { create } from "zustand";
import { toast } from "sonner";
import { cloneHotspotBlocks } from "@/lib/editor/blocks/content-buttons";
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
} from "@/lib/editor/constants/default-settings";
import {
  createEmptyModelState,
  createScene,
  INITIAL_SCENE_ID,
  SEED_SCENE,
} from "@/lib/editor/constants/seed-scene";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { usePreviewAppearanceStore } from "@/lib/editor/state/preview-appearance-store";
import { usePreviewMeshHighlightStore } from "@/lib/editor/state/preview-mesh-highlight-store";
import { usePreviewSpawnedHotspotsStore } from "@/lib/editor/state/preview-spawned-hotspots-store";
import { usePreviewVisibilityStore } from "@/lib/editor/state/preview-visibility-store";
import { cancelPendingWaits } from "@/lib/editor/actions/wait";
import {
  readEffectsSnapshot,
  useEffectsStore,
} from "@/lib/editor/state/effects-store";
import {
  readGeoSnapshot,
  useGeoStore,
} from "@/lib/editor/state/geo-store";
import {
  readLayersSnapshot,
  useLayersStore,
} from "@/lib/editor/state/layers-store";
import {
  readEnvironmentSnapshot,
  useEnvironmentStore,
} from "@/lib/editor/state/environment-store";
import { useModelStore } from "@/lib/editor/state/model-store";
import { sceneSubjectCache } from "@/lib/editor/state/scene-subject-cache";
import {
  readEditorSettingsSnapshot,
  useSettingsStore,
} from "@/lib/editor/state/settings-store";
import { cloneActionFences } from "@/lib/editor/types/action-fence";
import type { HotspotActionGraph } from "@/lib/editor/types/hotspot-action";
import {
  cloneGeoReference,
  type GeoReference,
} from "@/lib/editor/types/geo-reference";
import { cloneLayers } from "@/lib/editor/types/scene-layer";
import type { Scene } from "@/lib/editor/types/scene";
import type { SceneTypeId } from "@/lib/editor/types/scene-type";

function snapshotCurrentIntoScene(scene: Scene): Scene {
  const editor = useEditorStore.getState();
  const model = useModelStore.getState();
  return {
    ...scene,
    hotspots: editor.hotspots.map((h) => ({
      ...h,
      shape: h.shape ?? "circle",
      wick: h.wick ?? false,
      position: { ...h.position },
      blocks: cloneHotspotBlocks(h.blocks),
      enabled: h.enabled ?? true,
      customCameraEnabled: h.customCameraEnabled ?? false,
      customCamera: cloneCameraResetPosition(h.customCamera ?? null),
      actions: h.actions
        ? cloneActionGraph(h.actions)
        : createDefaultActionGraph(),
    })),
    startActions: cloneActionGraph(
      scene.startActions ?? createEmptyActionGraph(),
    ),
    legendActions: cloneActionGraph(
      scene.legendActions ?? createEmptyActionGraph(),
    ),
    actionFences: cloneActionFences(scene.actionFences),
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
    effects: readEffectsSnapshot(),
    geo: readGeoSnapshot(),
    layers: readLayersSnapshot(),
    geoReference: cloneGeoReference(scene.geoReference),
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

export type AddSceneInput = {
  name?: string;
  type: SceneTypeId;
};

type ScenesState = {
  scenes: Scene[];
  activeSceneId: string;
  /** Project-wide graph; runs once when Preview starts. */
  appStartActions: HotspotActionGraph;
  setAppStartActions: (graph: HotspotActionGraph) => void;
  setActiveSceneStartActions: (graph: HotspotActionGraph) => void;
  setActiveSceneLegendActions: (graph: HotspotActionGraph) => void;
  addScene: (input: AddSceneInput) => string;
  removeScene: (id: string) => void;
  renameScene: (id: string, name: string) => void;
  setPrimaryScene: (id: string) => void;
  switchScene: (id: string) => void;
  setSceneGeoReference: (sceneId: string, ref: GeoReference | null) => void;
};

export const useScenesStore = create<ScenesState>((set, get) => ({
  scenes: [
    {
      ...SEED_SCENE,
      type: SEED_SCENE.type,
      hotspots: SEED_SCENE.hotspots.map((h) => ({
        ...h,
        position: { ...h.position },
        blocks: cloneHotspotBlocks(h.blocks),
        enabled: h.enabled ?? true,
        customCameraEnabled: h.customCameraEnabled ?? false,
        customCamera: cloneCameraResetPosition(h.customCamera ?? null),
        actions: h.actions
          ? cloneActionGraph(h.actions)
          : createDefaultActionGraph(),
      })),
      startActions: cloneActionGraph(
        SEED_SCENE.startActions ?? createEmptyActionGraph(),
      ),
      legendActions: cloneActionGraph(
        SEED_SCENE.legendActions ?? createEmptyActionGraph(),
      ),
      actionFences: cloneActionFences(SEED_SCENE.actionFences),
      model: { ...SEED_SCENE.model, rotation: { ...SEED_SCENE.model.rotation } },
      settings: cloneEditorSettings(SEED_SCENE.settings),
      environment: cloneEnvironmentSettings(SEED_SCENE.environment),
      effects: cloneEffectsSettings(SEED_SCENE.effects),
      geo: cloneGeoSettings(SEED_SCENE.geo),
      layers: cloneLayers(SEED_SCENE.layers),
      geoReference: cloneGeoReference(SEED_SCENE.geoReference),
    },
  ],
  activeSceneId: INITIAL_SCENE_ID,
  appStartActions: createEmptyActionGraph(),

  setAppStartActions: (graph) => {
    set({ appStartActions: cloneActionGraph(graph) });
  },

  setActiveSceneStartActions: (graph) => {
    const state = get();
    set({
      scenes: state.scenes.map((scene) =>
        scene.id === state.activeSceneId
          ? { ...scene, startActions: cloneActionGraph(graph) }
          : scene,
      ),
    });
  },

  setActiveSceneLegendActions: (graph) => {
    const state = get();
    set({
      scenes: state.scenes.map((scene) =>
        scene.id === state.activeSceneId
          ? { ...scene, legendActions: cloneActionGraph(graph) }
          : scene,
      ),
    });
  },

  addScene: (input) => {
    const state = get();
    const snapshotted = state.scenes.map((s) =>
      s.id === state.activeSceneId ? snapshotCurrentIntoScene(s) : s,
    );
    const primary =
      snapshotted.find((s) => s.isPrimary) ?? snapshotted[0]!;
    const id = nextSceneId(snapshotted);
    const scene = createScene({
      id,
      name: input.name?.trim() || defaultNewSceneName(snapshotted),
      type: input.type,
      isPrimary: false,
      model: createEmptyModelState(input.type),
      // New scenes inherit the primary scene's settings, but start without a
      // Reset view pose so each scene can define its own camera home.
      settings: {
        ...primary.settings,
        resetPosition: null,
        customMenuButtons: [],
      },
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

    sceneSubjectCache.delete(id);

    set((current) => {
      const remaining = current.scenes.filter((s) => s.id !== id);
      const needsPrimary = !remaining.some((s) => s.isPrimary);
      const activeId =
        current.activeSceneId === id ? nextActiveId : current.activeSceneId;
      return {
        scenes: remaining.map((s) => {
          let next = s;
          if (needsPrimary && s.id === activeId) {
            next = { ...next, isPrimary: true };
          }
          if (next.geoReference?.geoSceneId === id) {
            next = {
              ...next,
              geoReference: {
                ...next.geoReference,
                status: "invalid",
                error: "Referenced Geo Map scene was deleted",
              },
            };
          }
          return next;
        }),
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
    useEffectsStore.getState().hydrateEffects(next.effects);
    useGeoStore.getState().hydrateGeo(next.geo);
    useLayersStore.getState().hydrateLayers(next.layers);

    void import("@/lib/editor/state/alignment-session-store").then(
      ({ useAlignmentSessionStore }) => {
        const session = useAlignmentSessionStore.getState();
        if (session.open && session.sceneId !== id) session.cancel();
      },
    );
    void import("@/lib/editor/state/coords-inspector-store").then(
      ({ useCoordsInspectorStore }) => {
        useCoordsInspectorStore.getState().reset();
      },
    );

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("editor:scene-switched", {
          detail: { sceneId: id },
        }),
      );
      // Scene Start runs after the scene is live in Preview.
      if (useEditorStore.getState().isPreview) {
        usePreviewVisibilityStore.getState().reset();
        usePreviewAppearanceStore.getState().reset();
        usePreviewMeshHighlightStore.getState().reset();
        usePreviewSpawnedHotspotsStore.getState().reset();
        cancelPendingWaits();
        void import("@/lib/editor/actions/run-action-graph").then(
          ({ runSceneStartActions }) => {
            void runSceneStartActions(id);
          },
        );
      }
    }
  },

  setSceneGeoReference: (sceneId, ref) => {
    set((state) => ({
      scenes: state.scenes.map((scene) => {
        if (scene.id !== sceneId) return scene;
        if (scene.type === "geo") return scene;
        return {
          ...scene,
          geoReference: ref ? cloneGeoReference(ref) : undefined,
        };
      }),
    }));
  },
}));

export const useActiveScene = () =>
  useScenesStore(
    (state) =>
      state.scenes.find((s) => s.id === state.activeSceneId) ?? state.scenes[0]!,
  );

export const usePrimaryScene = () =>
  useScenesStore((state) => state.scenes.find((s) => s.isPrimary) ?? null);

/** Persist the live settings store into the active scene entry. */
export function syncActiveSceneSettings() {
  const state = useScenesStore.getState();
  useScenesStore.setState({
    scenes: state.scenes.map((scene) =>
      scene.id === state.activeSceneId
        ? { ...scene, settings: readEditorSettingsSnapshot() }
        : scene,
    ),
  });
}

/** Persist the live geo store into the active scene entry. */
export function syncActiveSceneGeo() {
  const state = useScenesStore.getState();
  useScenesStore.setState({
    scenes: state.scenes.map((scene) =>
      scene.id === state.activeSceneId
        ? { ...scene, geo: readGeoSnapshot() }
        : scene,
    ),
  });
}

/** Persist the live layers store into the active scene entry. */
export function syncActiveSceneLayers() {
  const state = useScenesStore.getState();
  useScenesStore.setState({
    scenes: state.scenes.map((scene) =>
      scene.id === state.activeSceneId
        ? { ...scene, layers: readLayersSnapshot() }
        : scene,
    ),
  });
}
