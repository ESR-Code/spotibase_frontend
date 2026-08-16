import { create } from "zustand";
import { LEGEND_CATEGORY_ALL } from "@/lib/editor/types/legend-category";

export type HoverTooltipState = {
  x: number;
  y: number;
  title: string;
  /** Select-pinned label vs mouse hover label (drives enter animation). */
  pinned?: boolean;
} | null;

/** Screen-space anchor for the marker info box presentation. */
export type InfoBoxAnchorState = {
  x: number;
  y: number;
  /** False when the hotspot is behind the camera. */
  visible: boolean;
} | null;

export type OutlinerTab = "outliner" | "subject" | "layers";

export type ActionsModalScope =
  | { kind: "hotspot"; hotspotId: number }
  | { kind: "scene" };

export type SceneTransitionPhase = "in" | "hold" | "out";

export type SceneTransitionState = {
  sceneName: string;
  phase: SceneTransitionPhase;
} | null;

type UIState = {
  isLoading: boolean;
  outlinerCollapsed: boolean;
  outlinerTab: OutlinerTab;
  hudCollapsed: boolean;
  propertiesDrawerOpen: boolean;
  settingsDrawerOpen: boolean;
  generalSettingsDrawerOpen: boolean;
  legendDrawerOpen: boolean;
  /** Legend category filter in Preview (`LEGEND_CATEGORY_ALL` = show all). */
  legendFilterCategory: string;
  previewModalOpen: boolean;
  previewModalIndex: number;
  /** Hotspot selected by click in Preview (label / dialog target). */
  previewActiveHotspotId: number | null;
  /** Hide select label briefly after click before revealing with transition. */
  previewLabelPending: boolean;
  hoverTooltip: HoverTooltipState;
  /** Screen position of the active hotspot for info box presentation. */
  infoBoxAnchor: InfoBoxAnchorState;
  scenesModalOpen: boolean;
  actionsModal: ActionsModalScope | null;
  /** Splash overlay for Go To Scene action transitions. */
  sceneTransition: SceneTransitionState;
  setLoading: (value: boolean) => void;
  setOutlinerCollapsed: (value: boolean) => void;
  setOutlinerTab: (tab: OutlinerTab) => void;
  setHudCollapsed: (value: boolean) => void;
  setPropertiesDrawerOpen: (value: boolean) => void;
  setSettingsDrawerOpen: (value: boolean) => void;
  setGeneralSettingsDrawerOpen: (value: boolean) => void;
  setLegendDrawerOpen: (value: boolean) => void;
  setLegendFilterCategory: (value: string) => void;
  setPreviewModalOpen: (value: boolean) => void;
  setPreviewModalIndex: (index: number) => void;
  setPreviewActiveHotspotId: (id: number | null) => void;
  setPreviewLabelPending: (value: boolean) => void;
  setHoverTooltip: (value: HoverTooltipState) => void;
  setInfoBoxAnchor: (value: InfoBoxAnchorState) => void;
  setScenesModalOpen: (value: boolean) => void;
  openActionsModal: (scope: ActionsModalScope) => void;
  closeActionsModal: () => void;
  startSceneTransition: (sceneName: string) => void;
  holdSceneTransition: () => void;
  beginSceneTransitionOut: () => void;
  endSceneTransition: () => void;
  closeAllOverlays: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  isLoading: true,
  outlinerCollapsed: false,
  outlinerTab: "outliner",
  hudCollapsed: true,
  propertiesDrawerOpen: false,
  settingsDrawerOpen: false,
  generalSettingsDrawerOpen: false,
  legendDrawerOpen: false,
  legendFilterCategory: LEGEND_CATEGORY_ALL,
  previewModalOpen: false,
  previewModalIndex: 0,
  previewActiveHotspotId: null,
  previewLabelPending: false,
  hoverTooltip: null,
  infoBoxAnchor: null,
  scenesModalOpen: false,
  actionsModal: null,
  sceneTransition: null,
  setLoading: (isLoading) => set({ isLoading }),
  setOutlinerCollapsed: (outlinerCollapsed) => set({ outlinerCollapsed }),
  setOutlinerTab: (outlinerTab) => set({ outlinerTab }),
  setHudCollapsed: (hudCollapsed) => set({ hudCollapsed }),
  setPropertiesDrawerOpen: (propertiesDrawerOpen) =>
    set({ propertiesDrawerOpen }),
  setSettingsDrawerOpen: (settingsDrawerOpen) => set({ settingsDrawerOpen }),
  setGeneralSettingsDrawerOpen: (generalSettingsDrawerOpen) =>
    set({ generalSettingsDrawerOpen }),
  setLegendDrawerOpen: (legendDrawerOpen) => set({ legendDrawerOpen }),
  setLegendFilterCategory: (legendFilterCategory) =>
    set({ legendFilterCategory }),
  setPreviewModalOpen: (previewModalOpen) => set({ previewModalOpen }),
  setPreviewModalIndex: (previewModalIndex) => set({ previewModalIndex }),
  setPreviewActiveHotspotId: (previewActiveHotspotId) =>
    set({ previewActiveHotspotId }),
  setPreviewLabelPending: (previewLabelPending) =>
    set({ previewLabelPending }),
  setHoverTooltip: (hoverTooltip) => set({ hoverTooltip }),
  setInfoBoxAnchor: (infoBoxAnchor) => set({ infoBoxAnchor }),
  setScenesModalOpen: (scenesModalOpen) => set({ scenesModalOpen }),
  openActionsModal: (actionsModal) => set({ actionsModal }),
  closeActionsModal: () => set({ actionsModal: null }),
  startSceneTransition: (sceneName) =>
    set({ sceneTransition: { sceneName, phase: "in" } }),
  holdSceneTransition: () =>
    set((state) =>
      state.sceneTransition
        ? { sceneTransition: { ...state.sceneTransition, phase: "hold" } }
        : state,
    ),
  beginSceneTransitionOut: () =>
    set((state) =>
      state.sceneTransition
        ? { sceneTransition: { ...state.sceneTransition, phase: "out" } }
        : state,
    ),
  endSceneTransition: () => set({ sceneTransition: null }),
  closeAllOverlays: () =>
    set({
      settingsDrawerOpen: false,
      generalSettingsDrawerOpen: false,
      legendDrawerOpen: false,
      legendFilterCategory: LEGEND_CATEGORY_ALL,
      previewModalOpen: false,
      propertiesDrawerOpen: false,
      scenesModalOpen: false,
      actionsModal: null,
      previewActiveHotspotId: null,
      previewLabelPending: false,
      hoverTooltip: null,
      infoBoxAnchor: null,
    }),
}));
