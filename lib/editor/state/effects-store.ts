import { create } from "zustand";
import {
  cloneEffectsSettings,
  DEFAULT_EFFECTS_SETTINGS,
} from "@/lib/editor/constants/default-settings";
import type { EffectsSettings } from "@/lib/editor/types/editor-settings";

type EffectsState = EffectsSettings & {
  setEffects: (patch: Partial<EffectsSettings>) => void;
  resetEffects: () => void;
  hydrateEffects: (effects: EffectsSettings) => void;
};

function pickEffects(state: EffectsState): EffectsSettings {
  return cloneEffectsSettings({
    aoEnabled: state.aoEnabled,
    aoIntensity: state.aoIntensity,
    aoRadius: state.aoRadius,
    aoSamples: state.aoSamples,
    aoPower: state.aoPower,
    aoBlurEnabled: state.aoBlurEnabled,
  });
}

export const useEffectsStore = create<EffectsState>((set) => ({
  ...cloneEffectsSettings(DEFAULT_EFFECTS_SETTINGS),
  setEffects: (patch) => set((state) => ({ ...state, ...patch })),
  resetEffects: () =>
    set({ ...cloneEffectsSettings(DEFAULT_EFFECTS_SETTINGS) }),
  hydrateEffects: (effects) => set({ ...cloneEffectsSettings(effects) }),
}));

export function readEffectsSnapshot(): EffectsSettings {
  return pickEffects(useEffectsStore.getState());
}
