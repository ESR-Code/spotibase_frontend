import { create } from "zustand";
import { DEFAULT_MODEL_NAME } from "@/lib/editor/theme/tokens";

type SceneState = {
  modelName: string;
  modelInfo: string;
  wireframe: boolean;
  fps: number;
  triangleCount: number;
  engineReady: boolean;
  engineError: string | null;
  setModelMeta: (name: string, info: string) => void;
  setWireframe: (value: boolean) => void;
  setStats: (fps: number, triangleCount: number) => void;
  setEngineReady: (ready: boolean) => void;
  setEngineError: (error: string | null) => void;
};

export const useSceneStore = create<SceneState>((set) => ({
  modelName: DEFAULT_MODEL_NAME,
  modelInfo: "Default sample model",
  wireframe: false,
  fps: 60,
  triangleCount: 0,
  engineReady: false,
  engineError: null,
  setModelMeta: (name, info) => set({ modelName: name, modelInfo: info }),
  setWireframe: (wireframe) => set({ wireframe }),
  setStats: (fps, triangleCount) => set({ fps, triangleCount }),
  setEngineReady: (engineReady) => set({ engineReady }),
  setEngineError: (engineError) => set({ engineError }),
}));
