import type { Vec3 } from "@/lib/editor/types/hotspot";

export type ImageOverlayGeoPose = {
  space: "geo";
  lng: number;
  lat: number;
  widthMeters: number;
  bearing: number;
};

export type ImageOverlayWorldPose = {
  space: "world";
  position: Vec3;
  scale: number;
  rotationY: number;
};

export type ImageOverlayPose = ImageOverlayGeoPose | ImageOverlayWorldPose;

/** Shared geo placement for image and shape overlays. */
export type OverlayGeoPose = ImageOverlayGeoPose;

export type ImageOverlayLayer = {
  id: string;
  kind: "image-overlay";
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  /**
   * Edge feather 0–1. Uses a white-center / transparent-sides opacity map
   * so the overlay blends into the basemap at the edges.
   */
  blend: number;
  imageDataUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  pose: ImageOverlayPose;
};

export type ShapeOverlayKind = "square" | "triangle" | "circle";

export const SHAPE_OVERLAY_KINDS: readonly ShapeOverlayKind[] = [
  "square",
  "triangle",
  "circle",
] as const;

export const DEFAULT_SHAPE_FILL = "#3fb8af";
export const DEFAULT_SHAPE_STROKE = "#ecfeff";
export const DEFAULT_SHAPE_STROKE_WIDTH = 2;

export type ShapeOverlayLayer = {
  id: string;
  kind: "shape-overlay";
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  shape: ShapeOverlayKind;
  fillColor: string;
  strokeColor: string;
  /** Stroke width in screen pixels. */
  strokeWidth: number;
  pose: OverlayGeoPose;
};

/** Discriminated union of scene overlay layers. */
export type SceneLayer = ImageOverlayLayer | ShapeOverlayLayer;

export function isImageOverlayLayer(layer: SceneLayer): layer is ImageOverlayLayer {
  return layer.kind === "image-overlay";
}

export function isShapeOverlayLayer(layer: SceneLayer): layer is ShapeOverlayLayer {
  return layer.kind === "shape-overlay";
}

export function isGeoImageOverlay(
  layer: SceneLayer,
): layer is ImageOverlayLayer & { pose: ImageOverlayGeoPose } {
  return layer.kind === "image-overlay" && layer.pose.space === "geo";
}

export function isGeoShapeOverlay(
  layer: SceneLayer,
): layer is ShapeOverlayLayer {
  return layer.kind === "shape-overlay" && layer.pose.space === "geo";
}

export function isGeoOverlay(
  layer: SceneLayer,
): layer is
  | (ImageOverlayLayer & { pose: ImageOverlayGeoPose })
  | ShapeOverlayLayer {
  return isGeoImageOverlay(layer) || isGeoShapeOverlay(layer);
}

export function normalizeShapeKind(value: unknown): ShapeOverlayKind {
  return SHAPE_OVERLAY_KINDS.includes(value as ShapeOverlayKind)
    ? (value as ShapeOverlayKind)
    : "square";
}

export function cloneImageOverlayPose(pose: ImageOverlayPose): ImageOverlayPose {
  if (pose.space === "geo") {
    return {
      space: "geo",
      lng: pose.lng,
      lat: pose.lat,
      widthMeters: pose.widthMeters,
      bearing: pose.bearing,
    };
  }
  return {
    space: "world",
    position: { ...pose.position },
    scale: pose.scale,
    rotationY: pose.rotationY,
  };
}

export function cloneOverlayGeoPose(pose: OverlayGeoPose): OverlayGeoPose {
  return {
    space: "geo",
    lng: pose.lng,
    lat: pose.lat,
    widthMeters: pose.widthMeters,
    bearing: pose.bearing,
  };
}

export function cloneLayer(layer: SceneLayer): SceneLayer {
  if (layer.kind === "image-overlay") {
    return {
      ...layer,
      opacity: layer.opacity ?? 1,
      blend: clamp01(layer.blend ?? 0),
      pose: cloneImageOverlayPose(layer.pose),
    };
  }
  return {
    ...layer,
    opacity: layer.opacity ?? 1,
    shape: normalizeShapeKind(layer.shape),
    fillColor: layer.fillColor || DEFAULT_SHAPE_FILL,
    strokeColor: layer.strokeColor || DEFAULT_SHAPE_STROKE,
    strokeWidth: Math.max(
      0,
      Number.isFinite(layer.strokeWidth)
        ? layer.strokeWidth
        : DEFAULT_SHAPE_STROKE_WIDTH,
    ),
    pose: cloneOverlayGeoPose(layer.pose),
  };
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function cloneLayers(layers: readonly SceneLayer[] | undefined | null): SceneLayer[] {
  return (layers ?? []).map(cloneLayer);
}

export function nextLayerId(layers: readonly SceneLayer[]): string {
  let max = 0;
  for (const layer of layers) {
    const match = /^layer-(\d+)$/.exec(layer.id);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `layer-${max + 1}`;
}

export function shapeOverlayLabel(shape: ShapeOverlayKind): string {
  return shape.charAt(0).toUpperCase() + shape.slice(1);
}
