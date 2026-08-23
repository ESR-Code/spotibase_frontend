export const OVERLAY_RASTER_SOURCE_PREFIX = "editor-overlay-src-";
export const OVERLAY_RASTER_LAYER_PREFIX = "editor-overlay-raster-";
export const OVERLAY_HIT_SOURCE_PREFIX = "editor-overlay-hit-src-";
export const OVERLAY_HIT_LAYER_PREFIX = "editor-overlay-hit-";
export const SHAPE_SOURCE_PREFIX = "editor-shape-src-";
export const SHAPE_FILL_LAYER_PREFIX = "editor-shape-fill-";
export const SHAPE_LINE_LAYER_PREFIX = "editor-shape-line-";

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

export function shapeSourceId(layerId: string): string {
  return `${SHAPE_SOURCE_PREFIX}${layerId}`;
}

export function shapeFillLayerId(layerId: string): string {
  return `${SHAPE_FILL_LAYER_PREFIX}${layerId}`;
}

export function shapeLineLayerId(layerId: string): string {
  return `${SHAPE_LINE_LAYER_PREFIX}${layerId}`;
}

export function isOverlayHitLayerId(layerId: string): boolean {
  return layerId.startsWith(OVERLAY_HIT_LAYER_PREFIX);
}

export function layerIdFromHitLayer(layerId: string): string | null {
  if (!isOverlayHitLayerId(layerId)) return null;
  return layerId.slice(OVERLAY_HIT_LAYER_PREFIX.length);
}
