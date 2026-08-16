export const OVERLAY_RASTER_SOURCE_PREFIX = "editor-overlay-src-";
export const OVERLAY_RASTER_LAYER_PREFIX = "editor-overlay-raster-";
export const OVERLAY_HIT_SOURCE_PREFIX = "editor-overlay-hit-src-";
export const OVERLAY_HIT_LAYER_PREFIX = "editor-overlay-hit-";

export function overlayRasterSourceId(layerId: string): string {
  return `${OVERLAY_RASTER_SOURCE_PREFIX}${layerId}`;
}

export function overlayRasterLayerId(layerId: string): string {
  return `${OVERLAY_RASTER_LAYER_PREFIX}${layerId}`;
}

export function overlayHitSourceId(layerId: string): string {
  return `${OVERLAY_HIT_SOURCE_PREFIX}${layerId}`;
}

export function overlayHitLayerId(layerId: string): string {
  return `${OVERLAY_HIT_LAYER_PREFIX}${layerId}`;
}

export function isOverlayHitLayerId(layerId: string): boolean {
  return layerId.startsWith(OVERLAY_HIT_LAYER_PREFIX);
}

export function layerIdFromHitLayer(layerId: string): string | null {
  if (!isOverlayHitLayerId(layerId)) return null;
  return layerId.slice(OVERLAY_HIT_LAYER_PREFIX.length);
}
