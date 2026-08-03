import { create } from "zustand";
import {
  cloneEditorSettings,
  DEFAULT_EDITOR_SETTINGS,
} from "@/lib/editor/constants/default-settings";
import type { EditorSettings } from "@/lib/editor/types/editor-settings";

type SettingsState = EditorSettings & {
  setSettings: (patch: Partial<EditorSettings>) => void;
  resetSettings: () => void;
  hydrateSettings: (settings: EditorSettings) => void;
};

function pickSettings(state: SettingsState): EditorSettings {
  return cloneEditorSettings({
    hotspotSize: state.hotspotSize,
    hotspotRefDist: state.hotspotRefDist,
    minDistance: state.minDistance,
    maxDistance: state.maxDistance,
    minYaw: state.minYaw,
    maxYaw: state.maxYaw,
    minPitch: state.minPitch,
    maxPitch: state.maxPitch,
    resetPosition: state.resetPosition,
    gridColor: state.gridColor,
    gridOpacity: state.gridOpacity,
    gridSize: state.gridSize,
    previewShowLabelOnSelect: state.previewShowLabelOnSelect,
    hotspotLabelColor: state.hotspotLabelColor,
    hotspotLabelTextColor: state.hotspotLabelTextColor,
    hotspotLabelBorderColor: state.hotspotLabelBorderColor,
    markerDialogPresentation: state.markerDialogPresentation,
    markerDialogSize: state.markerDialogSize,
    markerDialogBackdrop: state.markerDialogBackdrop,
    markerDialogBackdropBlur: state.markerDialogBackdropBlur,
    markerDialogResetCameraOnClose: state.markerDialogResetCameraOnClose,
    legendEnabled: state.legendEnabled,
    legendCategories: state.legendCategories,
    logoUrl: state.logoUrl,
    logoScale: state.logoScale,
  });
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...cloneEditorSettings(DEFAULT_EDITOR_SETTINGS),
  setSettings: (patch) => set((state) => ({ ...state, ...patch })),
  resetSettings: () => set({ ...cloneEditorSettings(DEFAULT_EDITOR_SETTINGS) }),
  hydrateSettings: (settings) => set({ ...cloneEditorSettings(settings) }),
}));

export function readEditorSettingsSnapshot(): EditorSettings {
  return pickSettings(useSettingsStore.getState());
}
