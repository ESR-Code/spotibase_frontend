import {
  DEFAULT_GEO_GLOBE_CENTER,
  DEFAULT_GEO_GLOBE_ZOOM,
  isMapViewportPose,
} from "@/lib/editor/constants/default-settings";
import type { CameraResetPosition } from "@/lib/editor/types/editor-settings";
import type { GeoSettings } from "@/lib/editor/types/geo-settings";

export type GeoMapViewport = {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
};

export function defaultGeoGlobeViewport(): GeoMapViewport {
  return {
    center: [...DEFAULT_GEO_GLOBE_CENTER],
    zoom: DEFAULT_GEO_GLOBE_ZOOM,
    bearing: 0,
    pitch: 0,
  };
}

/** Home view: custom reset pose → start coords → default globe. */
export function resolveGeoHomeViewport(
  resetPosition: CameraResetPosition | null,
  geo: GeoSettings,
): GeoMapViewport {
  if (isMapViewportPose(resetPosition)) {
    return {
      center: [resetPosition.lng, resetPosition.lat],
      zoom: resetPosition.zoom,
      bearing: resetPosition.bearing ?? 0,
      pitch: resetPosition.pitch ?? 0,
    };
  }
  if (geo.start) {
    return {
      center: [geo.start.lng, geo.start.lat],
      zoom: geo.startZoom,
      bearing: 0,
      pitch: 0,
    };
  }
  return defaultGeoGlobeViewport();
}

export function poseFromGeoViewport(
  viewport: GeoMapViewport,
  previewUrl: string,
): CameraResetPosition {
  return {
    yaw: 0,
    pitch: viewport.pitch,
    distance: 0,
    target: { x: viewport.center[0], y: viewport.center[1], z: 0 },
    previewUrl,
    lng: viewport.center[0],
    lat: viewport.center[1],
    zoom: viewport.zoom,
    bearing: viewport.bearing,
  };
}
