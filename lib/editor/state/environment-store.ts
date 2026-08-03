import { create } from "zustand";
import {
  cloneEnvironmentSettings,
  DEFAULT_ENVIRONMENT_SETTINGS,
} from "@/lib/editor/constants/default-settings";
import type { EnvironmentSettings } from "@/lib/editor/types/editor-settings";

type EnvironmentState = EnvironmentSettings & {
  setEnvironment: (patch: Partial<EnvironmentSettings>) => void;
  resetEnvironment: () => void;
  hydrateEnvironment: (environment: EnvironmentSettings) => void;
};

function pickEnvironment(state: EnvironmentState): EnvironmentSettings {
  return cloneEnvironmentSettings({
    bgColor: state.bgColor,
    show3dGrid: state.show3dGrid,
    shadowIntensity: state.shadowIntensity,
    shadowColor: state.shadowColor,
    keyIntensity: state.keyIntensity,
    keyColor: state.keyColor,
    fillIntensity: state.fillIntensity,
    fillColor: state.fillColor,
    fillPitch: state.fillPitch,
    fillYaw: state.fillYaw,
  });
}

export const useEnvironmentStore = create<EnvironmentState>((set) => ({
  ...cloneEnvironmentSettings(DEFAULT_ENVIRONMENT_SETTINGS),
  setEnvironment: (patch) => set((state) => ({ ...state, ...patch })),
  resetEnvironment: () =>
    set({ ...cloneEnvironmentSettings(DEFAULT_ENVIRONMENT_SETTINGS) }),
  hydrateEnvironment: (environment) =>
    set({ ...cloneEnvironmentSettings(environment) }),
}));

export function readEnvironmentSnapshot(): EnvironmentSettings {
  return pickEnvironment(useEnvironmentStore.getState());
}
