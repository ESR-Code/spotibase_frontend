import type { LegendCategory } from "@/lib/editor/types/legend-category";

/** How marker content is presented when a hotspot is opened in preview. */
export type MarkerDialogPresentation = "modal" | "drawer" | "off";

/** Desktop width of the marker dialog. Mobile always uses fullscreen. */
export type MarkerDialogSize = "medium" | "large" | "fullscreen";

export type { LegendCategory };

/** User-defined camera pose used by Reset view (Home). */
export type CameraResetPosition = {
  yaw: number;
  pitch: number;
  distance: number;
  target: { x: number; y: number; z: number };
  /** Viewport screenshot preview as a data URL. */
  previewUrl: string;
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
  /** Marker dialog presentation: centered modal, side drawer, or disabled. */
  markerDialogPresentation: MarkerDialogPresentation;
  /** Desktop size for drawer/modal presentation. */
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
};

export type EnvironmentSettings = {
  bgColor: string;
  show3dGrid: boolean;
  shadowIntensity: number;
  shadowColor: string;
  keyIntensity: number;
  keyColor: string;
  fillIntensity: number;
  fillColor: string;
  fillPitch: number;
  fillYaw: number;
};
