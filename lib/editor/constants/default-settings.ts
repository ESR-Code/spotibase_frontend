import type { EditorSettings, EnvironmentSettings } from "@/lib/editor/types/editor-settings";

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  hotspotSize: 1,
  hotspotRefDist: 14,
  minDistance: 1,
  maxDistance: 40,
  minYaw: -180,
  maxYaw: 180,
  minPitch: 0,
  maxPitch: 94,
  gridColor: "#ffffff",
  gridOpacity: 0.45,
  gridSize: 42,
  markerDialogPresentation: "drawer",
  markerDialogBackdrop: false,
  markerDialogBackdropBlur: false,
};

export const DEFAULT_ENVIRONMENT_SETTINGS: EnvironmentSettings = {
  bgColor: "#c0cbdd",
  show3dGrid: true,
  shadowIntensity: 0.38,
  shadowColor: "#1e2433",
  keyIntensity: 2.35,
  keyColor: "#fff4e8",
  fillIntensity: 1.05,
  fillColor: "#9bb8ff",
  fillPitch: 35,
  fillYaw: -140,
};

export const GRID_BASE_SIZE = 42;
export const MARKER_SPRITE_SIZE = 0.45;
export const PREVIEW_CLICK_PX = 6;
