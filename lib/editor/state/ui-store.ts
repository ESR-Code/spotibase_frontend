import { create } from "zustand";

export type HoverTooltipState = {
  x: number;
  y: number;
  title: string;
} | null;

export type OutlinerTab = "outliner" | "subject";

type UIState = {
  isLoading: boolean;
  outlinerCollapsed: boolean;
  outlinerTab: OutlinerTab;
  hudCollapsed: boolean;
  propertiesDrawerOpen: boolean;
  settingsDrawerOpen: boolean;
  previewModalOpen: boolean;
  previewModalIndex: number;
  hoverTooltip: HoverTooltipState;
  setLoading: (value: boolean) => void;
  setOutlinerCollapsed: (value: boolean) => void;
  setOutlinerTab: (tab: OutlinerTab) => void;
  setHudCollapsed: (value: boolean) => void;
  setPropertiesDrawerOpen: (value: boolean) => void;
  setSettingsDrawerOpen: (value: boolean) => void;
  setPreviewModalOpen: (value: boolean) => void;
  setPreviewModalIndex: (index: number) => void;
  setHoverTooltip: (value: HoverTooltipState) => void;
  closeAllOverlays: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  isLoading: true,
  outlinerCollapsed: false,
  outlinerTab: "outliner",
  hudCollapsed: false,
  propertiesDrawerOpen: false,
  settingsDrawerOpen: false,
  previewModalOpen: false,
  previewModalIndex: 0,
  hoverTooltip: null,
  setLoading: (isLoading) => set({ isLoading }),
  setOutlinerCollapsed: (outlinerCollapsed) => set({ outlinerCollapsed }),
  setOutlinerTab: (outlinerTab) => set({ outlinerTab }),
  setHudCollapsed: (hudCollapsed) => set({ hudCollapsed }),
  setPropertiesDrawerOpen: (propertiesDrawerOpen) =>
    set({ propertiesDrawerOpen }),
  setSettingsDrawerOpen: (settingsDrawerOpen) => set({ settingsDrawerOpen }),
  setPreviewModalOpen: (previewModalOpen) => set({ previewModalOpen }),
  setPreviewModalIndex: (previewModalIndex) => set({ previewModalIndex }),
  setHoverTooltip: (hoverTooltip) => set({ hoverTooltip }),
  closeAllOverlays: () =>
    set({
      settingsDrawerOpen: false,
      previewModalOpen: false,
      propertiesDrawerOpen: false,
      hoverTooltip: null,
    }),
}));
