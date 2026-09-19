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

export type ModelMeshEntry = {
  /** Stable path within the loaded subject, e.g. `Body/Wheel_FL`. */
  id: string;
  /** Display name from the GLB node. */
  name: string;
};

export type ModelAnimationEntry = {
  /** Stable clip id used by the Animation action node and PlayCanvas state. */
  id: string;
  /** Display name from the GLB animation. */
  name: string;
  /** Clip length in seconds. */
  duration: number;
};

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
  meshes: ModelMeshEntry[];
  animations: ModelAnimationEntry[];
  setModelMeta: (name: string, info: string, hasUserModel?: boolean) => void;
  setModelScale: (scale: number) => void;
  setModelRotation: (axis: keyof ModelRotation, value: number) => void;
  setModelReflection: (reflection: number) => void;
  resetModelTransform: () => void;
  setWireframe: (value: boolean) => void;
  setStats: (fps: number, triangleCount: number) => void;
  setEngineReady: (ready: boolean) => void;
  setEngineError: (error: string | null) => void;
  setMeshes: (meshes: ModelMeshEntry[]) => void;
  setAnimations: (animations: ModelAnimationEntry[]) => void;
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
  meshes: [],
  animations: [],
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
  setStats: (fps, triangleCount) =>
    set((state) =>
      state.fps === fps && state.triangleCount === triangleCount
        ? state
        : { fps, triangleCount },
    ),
  setEngineReady: (engineReady) => set({ engineReady }),
  setEngineError: (engineError) => set({ engineError }),
  setMeshes: (meshes) => set({ meshes }),
  setAnimations: (animations) => set({ animations }),
  unload: () =>
    set({
      modelName: DEFAULT_MODEL_META.name,
      modelInfo: DEFAULT_MODEL_META.info,
      hasUserModel: false,
      modelScale: DEFAULT_MODEL_SCALE,
      modelRotation: { ...DEFAULT_MODEL_ROTATION },
      modelReflection: DEFAULT_MODEL_REFLECTION,
      triangleCount: 0,
      meshes: [],
      animations: [],
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
