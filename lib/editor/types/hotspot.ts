import type { HotspotBlock } from "@/lib/editor/types/hotspot-block";

export type HotspotType = "none" | "info" | "warning" | "spec" | "link";

/** Outliner / header label for hotspot type. */
export function hotspotTypeLabel(type: HotspotType): string {
  return type === "none" ? "default" : type;
}
export type HotspotStyle = "dot" | "number" | "icon" | "image";
export type EditorMode = "select" | "add" | "preview";

export type Vec3 = { x: number; y: number; z: number };

export type Hotspot = {
  id: number;
  title: string;
  desc: string;
  image: string;
  link: string;
  type: HotspotType;
  color: string;
  style: HotspotStyle;
  number: number | string;
  icon: string;
  markerImage: string;
  pulse: boolean;
  /** Legend category id; empty means uncategorized. */
  category: string;
  /** Display name in the Legend drawer; defaults to title. */
  legendName: string;
  position: Vec3;
  blocks: HotspotBlock[];
};

export type { HotspotBlock, HotspotBlockType } from "@/lib/editor/types/hotspot-block";

