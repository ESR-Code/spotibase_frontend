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

/** Discriminated union — add layer kinds here later. */
export type SceneLayer = ImageOverlayLayer;

export function isImageOverlayLayer(layer: SceneLayer): layer is ImageOverlayLayer {
  return layer.kind === "image-overlay";
}

export function isGeoImageOverlay(
  layer: SceneLayer,
): layer is ImageOverlayLayer & { pose: ImageOverlayGeoPose } {
  return layer.kind === "image-overlay" && layer.pose.space === "geo";
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

export function cloneLayer(layer: SceneLayer): SceneLayer {
  if (layer.kind === "image-overlay") {
    return {
      ...layer,
      opacity: layer.opacity ?? 1,
      blend: clamp01(layer.blend ?? 0),
      pose: cloneImageOverlayPose(layer.pose),
    };
  }
  return layer;
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
