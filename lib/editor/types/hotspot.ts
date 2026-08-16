import type { CameraResetPosition } from "@/lib/editor/types/editor-settings";
import type { HotspotActionGraph } from "@/lib/editor/types/hotspot-action";
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
  /**
   * When false, the hotspot is hidden on the map/model and cannot be
   * interacted with. Toggled by Enable/Disable action nodes.
   */
  enabled: boolean;
  /** Legend category id; empty means uncategorized. */
  category: string;
  /** Display name in the Legend drawer; defaults to title. */
  legendName: string;
  position: Vec3;
  blocks: HotspotBlock[];
  /**
   * When true and `customCamera` is set, focusing this hotspot animates
   * to the captured camera pose instead of the default look-at framing.
   */
  customCameraEnabled: boolean;
  /** Captured orbit pose + preview thumbnail; null until the user sets one. */
  customCamera: CameraResetPosition | null;
  /**
   * Action graph for preview click. `undefined` normalizes to a default
   * openModal chain; an explicit empty `nodes: []` means do nothing.
   */
  actions?: HotspotActionGraph;
};

export type { HotspotBlock, HotspotBlockType } from "@/lib/editor/types/hotspot-block";
export type {
  ActionNode,
  ActionNodeType,
  HotspotActionGraph,
} from "@/lib/editor/types/hotspot-action";

