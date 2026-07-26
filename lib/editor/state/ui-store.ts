import { create } from "zustand";

export type HoverTooltipState = {
  x: number;
  y: number;
  title: string;
} | null;

type UIState = {
  isLoading: boolean;
  outlinerCollapsed: boolean;
  hudCollapsed: boolean;
  propertiesDrawerOpen: boolean;
  settingsDrawerOpen: boolean;
  environmentPanelOpen: boolean;
  previewModalOpen: boolean;
  previewModalIndex: number;
  fileMenuOpen: boolean;
  hoverTooltip: HoverTooltipState;
  setLoading: (value: boolean) => void;
  setOutlinerCollapsed: (value: boolean) => void;
  setHudCollapsed: (value: boolean) => void;
  setPropertiesDrawerOpen: (value: boolean) => void;
  setSettingsDrawerOpen: (value: boolean) => void;
  setEnvironmentPanelOpen: (value: boolean) => void;
  setPreviewModalOpen: (value: boolean) => void;
  setPreviewModalIndex: (index: number) => void;
  setFileMenuOpen: (value: boolean) => void;
  setHoverTooltip: (value: HoverTooltipState) => void;
  closeAllOverlays: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  isLoading: true,
  outlinerCollapsed: false,
  hudCollapsed: false,
  propertiesDrawerOpen: false,
  settingsDrawerOpen: false,
  environmentPanelOpen: false,
  previewModalOpen: false,
  previewModalIndex: 0,
  fileMenuOpen: false,
  hoverTooltip: null,
  setLoading: (isLoading) => set({ isLoading }),
  setOutlinerCollapsed: (outlinerCollapsed) => set({ outlinerCollapsed }),
  setHudCollapsed: (hudCollapsed) => set({ hudCollapsed }),
  setPropertiesDrawerOpen: (propertiesDrawerOpen) =>
    set({ propertiesDrawerOpen }),
  setSettingsDrawerOpen: (settingsDrawerOpen) => set({ settingsDrawerOpen }),
  setEnvironmentPanelOpen: (environmentPanelOpen) =>
    set({ environmentPanelOpen }),
  setPreviewModalOpen: (previewModalOpen) => set({ previewModalOpen }),
  setPreviewModalIndex: (previewModalIndex) => set({ previewModalIndex }),
  setFileMenuOpen: (fileMenuOpen) => set({ fileMenuOpen }),
  setHoverTooltip: (hoverTooltip) => set({ hoverTooltip }),
  closeAllOverlays: () =>
    set({
      settingsDrawerOpen: false,
      environmentPanelOpen: false,
      previewModalOpen: false,
      fileMenuOpen: false,
      propertiesDrawerOpen: false,
      hoverTooltip: null,
    }),
}));
