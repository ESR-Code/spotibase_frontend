import {
  DEFAULT_HOTSPOT_SHAPE,
  normalizeHotspotShape,
  type HotspotShape,
} from "@/lib/editor/types/hotspot";

/** Landmark pin in a 100×130 viewBox — circular head + pointed tip. */
export const HOTSPOT_PIN_PATH =
  "M50 128L12.18 79.55A48 48 0 1 1 87.82 79.55Z";

/** Same pin with a center hole for empty / dot style. */
export const HOTSPOT_PIN_HOLE_PATH = `${HOTSPOT_PIN_PATH}M50 25c13.81 0 25 11.19 25 25s-11.19 25-25 25-25-11.19-25-25 11.19-25 25-25z`;

/** CSS modifier for DOM marker previews (outliner, legend, geo). */
export function hotspotShapeClass(
  shape: HotspotShape | undefined | null,
): string {
  const resolved = normalizeHotspotShape(shape ?? DEFAULT_HOTSPOT_SHAPE);
  return `editor-marker-shape-${resolved}`;
}
