import type { HotspotActionGraph } from "@/lib/editor/types/hotspot-action";
import type { LegendCategory } from "@/lib/editor/types/legend-category";

/** How marker content is presented when a hotspot is opened in preview. */
export type MarkerDialogPresentation = "modal" | "drawer" | "infobox";

/** Desktop width of the marker dialog. Mobile always uses fullscreen. */
export type MarkerDialogSize = "medium" | "large" | "fullscreen";

export type { LegendCategory };

/** User-defined Preview bottom-bar button, wired in the Actions editor. */
export type CustomMenuButton = {
  id: string;
  /** Synthetic action-graph owner id (≤ MENU_BUTTON_OWNER_BASE). */
  ownerId: number;
  /** Lucide icon name from CATEGORY_ICONS. */
  icon: string;
  tooltip: string;
  /** When true, the button latches on click and exposes a second action chain. */
  toggleEnabled: boolean;
  /** Icon shown while the button is in its toggled (on) state. */
  toggledIcon: string;
  actions: HotspotActionGraph;
};

/** User-defined camera pose used by Reset view (Home). */
export type CameraResetPosition = {
  yaw: number;
  pitch: number;
  distance: number;
  target: { x: number; y: number; z: number };
  /** Viewport screenshot preview as a data URL. */
  previewUrl: string;
  /** Geo map center longitude. Present on map poses. */
  lng?: number;
  /** Geo map center latitude. Present on map poses. */
  lat?: number;
  /** Geo map zoom. Present on map poses. */
  zoom?: number;
  /** Geo map bearing in degrees. */
  bearing?: number;
};

export type EditorSettings = {
  hotspotSize: number;
  hotspotRefDist: number;
  minDistance: number;
  maxDistance: number;
  minYaw: number;
  maxYaw: number;
  minPitch: number;
  maxPitch: number;
  /** Geo map closest zoom (MapLibre 0–22). */
  minZoom: number;
  /** Geo map farthest zoom (MapLibre 0–22). */
  maxZoom: number;
  /**
   * Custom Reset view pose. When null, Reset view uses the default
   * zoom-extents framing for the current model.
   */
  resetPosition: CameraResetPosition | null;
  gridColor: string;
  gridOpacity: number;
  gridSize: number;
  /** Keep the hotspot title label visible after selecting in Preview. */
  previewShowLabelOnSelect: boolean;
  /** Hotspot hover/select label background color. */
  hotspotLabelColor: string;
  /** Hotspot label text color. */
  hotspotLabelTextColor: string;
  /** Hotspot label border color. */
  hotspotLabelBorderColor: string;
  /** Marker dialog presentation: centered modal, side drawer, or anchored info box. */
  markerDialogPresentation: MarkerDialogPresentation;
  /** Desktop size for drawer/modal/info box presentation. */
  markerDialogSize: MarkerDialogSize;
  /** Dimmed overlay behind the marker dialog. */
  markerDialogBackdrop: boolean;
  /** Blur the viewport through the backdrop (requires backdrop). */
  markerDialogBackdropBlur: boolean;
  /** Return the camera to the home view when the marker dialog closes. */
  markerDialogResetCameraOnClose: boolean;
  /** Show the Legend button and drawer in Preview. */
  legendEnabled: boolean;
  /** User-defined legend categories available for hotspot assignment. */
  legendCategories: LegendCategory[];
  /** Project logo as a data URL or remote URL; empty when unset. */
  logoUrl: string;
  /** Display scale for the viewport logo overlay. */
  logoScale: number;
  /** Custom Preview bottom-menu buttons for this scene. */
  customMenuButtons: CustomMenuButton[];
};

export type EnvironmentSettings = {
  bgColor: string;
  show3dGrid: boolean;
  shadowIntensity: number;
  shadowColor: string;
  keyIntensity: number;
  keyColor: string;
  keyPitch: number;
  keyYaw: number;
  fillIntensity: number;
  fillColor: string;
  fillPitch: number;
  fillYaw: number;
};

/** Per-scene post-processing effects (3D model scenes). */
export type EffectsSettings = {
  /** Screen-space ambient occlusion via PlayCanvas CameraFrame SSAO. */
  aoEnabled: boolean;
  /** SSAO intensity, 0–1. */
  aoIntensity: number;
  /** SSAO sample radius in world units, 0–100. */
  aoRadius: number;
  /** SSAO sample count, 1–64. */
  aoSamples: number;
  /** SSAO contrast/power curve, 0.1–10. */
  aoPower: number;
  /** Soften SSAO with a blur pass. */
  aoBlurEnabled: boolean;
};
