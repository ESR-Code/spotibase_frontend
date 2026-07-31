import type { HotspotBlock } from "@/lib/editor/types/hotspot-block";

export type HotspotType = "info" | "warning" | "spec" | "link";
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
  position: Vec3;
  blocks: HotspotBlock[];
};

export type { HotspotBlock, HotspotBlockType } from "@/lib/editor/types/hotspot-block";

