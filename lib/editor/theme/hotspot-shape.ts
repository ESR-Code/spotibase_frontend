import {
  DEFAULT_HOTSPOT_SHAPE,
  normalizeHotspotShape,
  type HotspotShape,
} from "@/lib/editor/types/hotspot";

/** CSS modifier for DOM marker previews (outliner, legend, geo). */
export function hotspotShapeClass(
  shape: HotspotShape | undefined | null,
): string {
  const resolved = normalizeHotspotShape(shape ?? DEFAULT_HOTSPOT_SHAPE);
  return `editor-marker-shape-${resolved}`;
}
