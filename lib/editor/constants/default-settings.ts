import type {
  CameraResetPosition,
  EditorSettings,
  EnvironmentSettings,
} from "@/lib/editor/types/editor-settings";
import type { LegendCategory } from "@/lib/editor/types/legend-category";

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  hotspotSize: 1,
  hotspotRefDist: 14,
  minDistance: 1,
  maxDistance: 40,
  minYaw: -180,
  maxYaw: 180,
  minPitch: 0,
  maxPitch: 94,
  resetPosition: null,
  gridColor: "#ffffff",
  gridOpacity: 0.45,
  gridSize: 42,
  previewShowLabelOnSelect: false,
  hotspotLabelColor: "#15243f",
  hotspotLabelTextColor: "#ffffff",
  hotspotLabelBorderColor: "#e63946",
  markerDialogPresentation: "drawer",
  markerDialogSize: "medium",
  markerDialogBackdrop: false,
  markerDialogBackdropBlur: false,
  markerDialogResetCameraOnClose: true,
  legendEnabled: false,
  legendCategories: [],
  logoUrl: "",
  logoScale: 1,
};

export function cloneCameraResetPosition(
  resetPosition: CameraResetPosition | null,
): CameraResetPosition | null {
  if (!resetPosition) return null;
  return {
    yaw: resetPosition.yaw,
    pitch: resetPosition.pitch,
    distance: resetPosition.distance,
    target: { ...resetPosition.target },
    previewUrl: resetPosition.previewUrl,
  };
}

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

export function cloneLegendCategories(
  categories: LegendCategory[],
): LegendCategory[] {
  return categories.map((c) => ({ ...c }));
}

export function cloneEditorSettings(settings: EditorSettings): EditorSettings {
  return {
    ...settings,
    resetPosition: cloneCameraResetPosition(settings.resetPosition ?? null),
    legendCategories: cloneLegendCategories(settings.legendCategories ?? []),
  };
}

export function cloneEnvironmentSettings(
  environment: EnvironmentSettings,
): EnvironmentSettings {
  return { ...environment };
}
