import { create } from "zustand";
import { DEFAULT_MODEL_NAME } from "@/lib/editor/theme/tokens";
import type { ModelRotation, SceneModelState } from "@/lib/editor/types/scene";

export type { ModelRotation };

export const DEFAULT_MODEL_SCALE = 1;
export const DEFAULT_MODEL_ROTATION: ModelRotation = { x: 0, y: 0, z: 0 };
/** Full original gloss/specular from the imported materials. */
export const DEFAULT_MODEL_REFLECTION = 1;

export const DEFAULT_MODEL_META = {
  name: DEFAULT_MODEL_NAME,
  info: "Default sample model",
  hasUserModel: false,
} as const;

type ModelState = {
  modelName: string;
  modelInfo: string;
  hasUserModel: boolean;
  modelScale: number;
  modelRotation: ModelRotation;
  modelReflection: number;
  wireframe: boolean;
  fps: number;
  triangleCount: number;
  engineReady: boolean;
  engineError: string | null;
  setModelMeta: (name: string, info: string, hasUserModel?: boolean) => void;
  setModelScale: (scale: number) => void;
  setModelRotation: (axis: keyof ModelRotation, value: number) => void;
  setModelReflection: (reflection: number) => void;
  resetModelTransform: () => void;
  setWireframe: (value: boolean) => void;
  setStats: (fps: number, triangleCount: number) => void;
  setEngineReady: (ready: boolean) => void;
  setEngineError: (error: string | null) => void;
  unload: () => void;
  hydrateFromScene: (model: SceneModelState) => void;
};

export const useModelStore = create<ModelState>((set) => ({
  modelName: DEFAULT_MODEL_META.name,
  modelInfo: DEFAULT_MODEL_META.info,
  hasUserModel: DEFAULT_MODEL_META.hasUserModel,
  modelScale: DEFAULT_MODEL_SCALE,
  modelRotation: { ...DEFAULT_MODEL_ROTATION },
  modelReflection: DEFAULT_MODEL_REFLECTION,
  wireframe: false,
  fps: 60,
  triangleCount: 0,
  engineReady: false,
  engineError: null,
  setModelMeta: (name, info, hasUserModel) =>
    set((state) => ({
      modelName: name,
      modelInfo: info,
      hasUserModel:
        hasUserModel === undefined ? state.hasUserModel : hasUserModel,
    })),
  setModelScale: (modelScale) => set({ modelScale }),
  setModelRotation: (axis, value) =>
    set((state) => ({
      modelRotation: { ...state.modelRotation, [axis]: value },
    })),
  setModelReflection: (modelReflection) =>
    set({
      modelReflection: Math.min(1, Math.max(0, modelReflection)),
    }),
  resetModelTransform: () =>
    set({
      modelScale: DEFAULT_MODEL_SCALE,
      modelRotation: { ...DEFAULT_MODEL_ROTATION },
    }),
  setWireframe: (wireframe) => set({ wireframe }),
  setStats: (fps, triangleCount) => set({ fps, triangleCount }),
  setEngineReady: (engineReady) => set({ engineReady }),
  setEngineError: (engineError) => set({ engineError }),
  unload: () =>
    set({
      modelName: DEFAULT_MODEL_META.name,
      modelInfo: DEFAULT_MODEL_META.info,
      hasUserModel: false,
      modelScale: DEFAULT_MODEL_SCALE,
      modelRotation: { ...DEFAULT_MODEL_ROTATION },
      modelReflection: DEFAULT_MODEL_REFLECTION,
      triangleCount: 0,
    }),
  hydrateFromScene: (model) =>
    set({
      modelName: model.name,
      modelInfo: model.info,
      hasUserModel: model.hasUserModel,
      modelScale: model.scale,
      modelRotation: { ...model.rotation },
      modelReflection: model.reflection ?? DEFAULT_MODEL_REFLECTION,
    }),
}));
