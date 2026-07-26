import { create } from "zustand";
import { DEFAULT_EDITOR_SETTINGS } from "@/lib/editor/constants/default-settings";
import type { EditorSettings } from "@/lib/editor/types/editor-settings";

type SettingsState = EditorSettings & {
  setSettings: (patch: Partial<EditorSettings>) => void;
  resetSettings: () => void;
};

export const useSettingsStore = create<SettingsState>((set) => ({
  ...DEFAULT_EDITOR_SETTINGS,
  setSettings: (patch) => set((state) => ({ ...state, ...patch })),
  resetSettings: () => set({ ...DEFAULT_EDITOR_SETTINGS }),
}));
