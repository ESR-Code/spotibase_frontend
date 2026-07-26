import { create } from "zustand";
import { DEFAULT_ENVIRONMENT_SETTINGS } from "@/lib/editor/constants/default-settings";
import type { EnvironmentSettings } from "@/lib/editor/types/editor-settings";

type EnvironmentState = EnvironmentSettings & {
  setEnvironment: (patch: Partial<EnvironmentSettings>) => void;
  resetEnvironment: () => void;
};

export const useEnvironmentStore = create<EnvironmentState>((set) => ({
  ...DEFAULT_ENVIRONMENT_SETTINGS,
  setEnvironment: (patch) => set((state) => ({ ...state, ...patch })),
  resetEnvironment: () => set({ ...DEFAULT_ENVIRONMENT_SETTINGS }),
}));
