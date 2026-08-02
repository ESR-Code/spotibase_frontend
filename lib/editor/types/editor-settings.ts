import type { LegendCategory } from "@/lib/editor/types/legend-category";

/** How marker content is presented when a hotspot is opened in preview. */
export type MarkerDialogPresentation = "modal" | "drawer" | "off";

/** Desktop width of the marker dialog. Mobile always uses fullscreen. */
export type MarkerDialogSize = "medium" | "large" | "fullscreen";

export type { LegendCategory };

export type EditorSettings = {
  hotspotSize: number;
  hotspotRefDist: number;
  minDistance: number;
  maxDistance: number;
  minYaw: number;
  maxYaw: number;
  minPitch: number;
  maxPitch: number;
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
