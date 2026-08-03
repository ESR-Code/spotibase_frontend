import { create } from "zustand";

export type HoverTooltipState = {
  x: number;
  y: number;
  title: string;
  /** Select-pinned label vs mouse hover label (drives enter animation). */
  pinned?: boolean;
} | null;

export type OutlinerTab = "outliner" | "subject";

type UIState = {
  isLoading: boolean;
  outlinerCollapsed: boolean;
  outlinerTab: OutlinerTab;
  hudCollapsed: boolean;
  propertiesDrawerOpen: boolean;
  settingsDrawerOpen: boolean;
  legendDrawerOpen: boolean;
  previewModalOpen: boolean;
  previewModalIndex: number;
  /** Hotspot selected by click in Preview (label / dialog target). */
  previewActiveHotspotId: number | null;
  /** Hide select label briefly after click before revealing with transition. */
  previewLabelPending: boolean;
  hoverTooltip: HoverTooltipState;
  scenesModalOpen: boolean;
  setLoading: (value: boolean) => void;
  setOutlinerCollapsed: (value: boolean) => void;
  setOutlinerTab: (tab: OutlinerTab) => void;
  setHudCollapsed: (value: boolean) => void;
  setPropertiesDrawerOpen: (value: boolean) => void;
  setSettingsDrawerOpen: (value: boolean) => void;
  setLegendDrawerOpen: (value: boolean) => void;
  setPreviewModalOpen: (value: boolean) => void;
  setPreviewModalIndex: (index: number) => void;
  setPreviewActiveHotspotId: (id: number | null) => void;
  setPreviewLabelPending: (value: boolean) => void;
  setHoverTooltip: (value: HoverTooltipState) => void;
  setScenesModalOpen: (value: boolean) => void;
  closeAllOverlays: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  isLoading: true,
  outlinerCollapsed: false,
  outlinerTab: "outliner",
  hudCollapsed: true,
  propertiesDrawerOpen: false,
  settingsDrawerOpen: false,
  legendDrawerOpen: false,
  previewModalOpen: false,
  previewModalIndex: 0,
  previewActiveHotspotId: null,
  previewLabelPending: false,
  hoverTooltip: null,
  scenesModalOpen: false,
  setLoading: (isLoading) => set({ isLoading }),
  setOutlinerCollapsed: (outlinerCollapsed) => set({ outlinerCollapsed }),
  setOutlinerTab: (outlinerTab) => set({ outlinerTab }),
  setHudCollapsed: (hudCollapsed) => set({ hudCollapsed }),
  setPropertiesDrawerOpen: (propertiesDrawerOpen) =>
    set({ propertiesDrawerOpen }),
  setSettingsDrawerOpen: (settingsDrawerOpen) => set({ settingsDrawerOpen }),
  setLegendDrawerOpen: (legendDrawerOpen) => set({ legendDrawerOpen }),
  setPreviewModalOpen: (previewModalOpen) => set({ previewModalOpen }),
  setPreviewModalIndex: (previewModalIndex) => set({ previewModalIndex }),
  setPreviewActiveHotspotId: (previewActiveHotspotId) =>
    set({ previewActiveHotspotId }),
  setPreviewLabelPending: (previewLabelPending) =>
    set({ previewLabelPending }),
  setHoverTooltip: (hoverTooltip) => set({ hoverTooltip }),
  setScenesModalOpen: (scenesModalOpen) => set({ scenesModalOpen }),
  closeAllOverlays: () =>
    set({
      settingsDrawerOpen: false,
      legendDrawerOpen: false,
      previewModalOpen: false,
      propertiesDrawerOpen: false,
      scenesModalOpen: false,
      previewActiveHotspotId: null,
      previewLabelPending: false,
      hoverTooltip: null,
    }),
}));
