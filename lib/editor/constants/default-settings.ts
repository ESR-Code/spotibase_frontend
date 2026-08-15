import type {
  CameraResetPosition,
  EditorSettings,
  EffectsSettings,
  EnvironmentSettings,
} from "@/lib/editor/types/editor-settings";
import type { GeoSettings } from "@/lib/editor/types/geo-settings";
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
  minZoom: 0,
  maxZoom: 22,
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
    lng: resetPosition.lng,
    lat: resetPosition.lat,
    zoom: resetPosition.zoom,
    bearing: resetPosition.bearing,
  };
}

export function isMapViewportPose(
  pose: CameraResetPosition | null | undefined,
): pose is CameraResetPosition & { lng: number; lat: number; zoom: number } {
  return (
    pose != null &&
    pose.lng != null &&
    pose.lat != null &&
    pose.zoom != null
  );
}

/** Default globe look when a geo scene has no start pin. */
export const DEFAULT_GEO_GLOBE_CENTER: [number, number] = [0, 20];
export const DEFAULT_GEO_GLOBE_ZOOM = 1.6;
export const DEFAULT_GEO_PIN_ZOOM = 12;
export const GEO_MIN_ZOOM = 0;
export const GEO_MAX_ZOOM = 22;

export const DEFAULT_GEO_SETTINGS: GeoSettings = {
  start: null,
  startZoom: DEFAULT_GEO_GLOBE_ZOOM,
};

export function cloneGeoSettings(geo: Partial<GeoSettings> = {}): GeoSettings {
  return {
    start: geo.start ? { ...geo.start } : null,
    startZoom: geo.startZoom ?? DEFAULT_GEO_SETTINGS.startZoom,
  };
}

export const DEFAULT_ENVIRONMENT_SETTINGS: EnvironmentSettings = {
  bgColor: "#c0cbdd",
  show3dGrid: true,
  shadowIntensity: 0.35,
  shadowColor: "#4b5b81",
  keyIntensity: 2.35,
  keyColor: "#fff4e8",
  // Matches prior fixed key direction (~7, 14, 5).
  keyPitch: 58,
  keyYaw: 54,
  fillIntensity: 2.3,
  fillColor: "#9bb8ff",
  fillPitch: 35,
  fillYaw: -140,
};

export const DEFAULT_EFFECTS_SETTINGS: EffectsSettings = {
  aoEnabled: false,
  aoIntensity: 0.5,
  aoRadius: 30,
  aoSamples: 12,
  aoPower: 6,
  aoBlurEnabled: true,
};

export const GRID_BASE_SIZE = 42;
export const MARKER_SPRITE_SIZE = 0.45;
export const PREVIEW_CLICK_PX = 6;

export function cloneLegendCategories(
  categories: LegendCategory[],
): LegendCategory[] {
  return categories.map((c) => ({ ...c }));
}

/** Normalize legacy presentation values (e.g. removed `"off"`). */
export function normalizeMarkerDialogPresentation(
  value: string | undefined,
): EditorSettings["markerDialogPresentation"] {
  if (value === "modal" || value === "drawer" || value === "infobox") {
    return value;
  }
  // Legacy `"off"` (camera-only) — Actions now control whether the dialog opens.
  return DEFAULT_EDITOR_SETTINGS.markerDialogPresentation;
}

export function cloneEditorSettings(settings: EditorSettings): EditorSettings {
  const presentation = normalizeMarkerDialogPresentation(
    settings.markerDialogPresentation,
  );
  const size =
    presentation === "infobox" && settings.markerDialogSize === "fullscreen"
      ? "medium"
      : settings.markerDialogSize;

  return {
    ...settings,
    minZoom: settings.minZoom ?? DEFAULT_EDITOR_SETTINGS.minZoom,
    maxZoom: settings.maxZoom ?? DEFAULT_EDITOR_SETTINGS.maxZoom,
    markerDialogPresentation: presentation,
    markerDialogSize: size,
    markerDialogBackdrop:
      presentation === "infobox" ? false : settings.markerDialogBackdrop,
    markerDialogBackdropBlur:
      presentation === "infobox" ? false : settings.markerDialogBackdropBlur,
    resetPosition: cloneCameraResetPosition(settings.resetPosition ?? null),
    legendCategories: cloneLegendCategories(settings.legendCategories ?? []),
  };
}

export function cloneEnvironmentSettings(
  environment: Partial<EnvironmentSettings>,
): EnvironmentSettings {
  return { ...DEFAULT_ENVIRONMENT_SETTINGS, ...environment };
}

export function cloneEffectsSettings(
  effects: Partial<EffectsSettings>,
): EffectsSettings {
  return { ...DEFAULT_EFFECTS_SETTINGS, ...effects };
}
