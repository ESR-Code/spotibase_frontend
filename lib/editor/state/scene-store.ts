import { create } from "zustand";
import { DEFAULT_MODEL_NAME } from "@/lib/editor/theme/tokens";

export type ModelRotation = {
  x: number;
  y: number;
  z: number;
};

export const DEFAULT_MODEL_SCALE = 1;
export const DEFAULT_MODEL_ROTATION: ModelRotation = { x: 0, y: 0, z: 0 };

type SceneState = {
  modelName: string;
  modelInfo: string;
  hasUserModel: boolean;
  modelScale: number;
  modelRotation: ModelRotation;
  wireframe: boolean;
  fps: number;
  triangleCount: number;
  engineReady: boolean;
  engineError: string | null;
  setModelMeta: (name: string, info: string, hasUserModel?: boolean) => void;
  setModelScale: (scale: number) => void;
  setModelRotation: (axis: keyof ModelRotation, value: number) => void;
  resetModelTransform: () => void;
  setWireframe: (value: boolean) => void;
  setStats: (fps: number, triangleCount: number) => void;
  setEngineReady: (ready: boolean) => void;
  setEngineError: (error: string | null) => void;
};

export const useSceneStore = create<SceneState>((set) => ({
  modelName: DEFAULT_MODEL_NAME,
  modelInfo: "Default sample model",
  hasUserModel: false,
  modelScale: DEFAULT_MODEL_SCALE,
  modelRotation: { ...DEFAULT_MODEL_ROTATION },
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
  resetModelTransform: () =>
    set({
      modelScale: DEFAULT_MODEL_SCALE,
      modelRotation: { ...DEFAULT_MODEL_ROTATION },
    }),
  setWireframe: (wireframe) => set({ wireframe }),
  setStats: (fps, triangleCount) => set({ fps, triangleCount }),
  setEngineReady: (engineReady) => set({ engineReady }),
  setEngineError: (engineError) => set({ engineError }),
}));
