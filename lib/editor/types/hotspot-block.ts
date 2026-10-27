import type { HotspotActionGraph } from "@/lib/editor/types/hotspot-action";

export type HotspotBlockType =
  | "heading"
  | "text"
  | "link"
  | "image"
  | "video"
  | "button"
  | "file"
  | "iframe"
  | "divider"
  | "callout";

export type HotspotBlockBase = {
  id: string;
};

export type HeadingBlock = HotspotBlockBase & {
  type: "heading";
  content: string;
};

export type TextBlock = HotspotBlockBase & {
  type: "text";
  content: string;
};

export type LinkBlock = HotspotBlockBase & {
  type: "link";
  /** Button label shown in the marker dialog. */
  label: string;
  /** Destination opened in a new tab when the button is clicked. */
  url: string;
};

/** One slide in an image block. Caption is optional. */
export type ImageBlockItem = {
  id: string;
  src: string;
  caption: string;
};

export type ImageBlock = HotspotBlockBase & {
  type: "image";
  items: ImageBlockItem[];
};

export type VideoBlock = HotspotBlockBase & {
  type: "video";
  /** YouTube or Vimeo URL. Uploads are not supported. */
  url: string;
};

/** Preset fill for Action button blocks (see `BUTTON_BLOCK_COLORS`). */
export type ButtonBlockColor =
  | "neutral"
  | "accent"
  | "blue"
  | "green"
  | "amber"
  | "red"
  | "purple";

export type ButtonBlock = HotspotBlockBase & {
  type: "button";
  /** Lucide icon name from CATEGORY_ICONS. */
  icon: string;
  label: string;
  /** Optional italic line under the label in Preview. */
  description: string;
  /** Missing on blocks saved before colors existed: those keep the accent look. */
  color?: ButtonBlockColor;
  /** Synthetic action-graph owner id (content-button range). */
  ownerId: number;
  actions: HotspotActionGraph;
};

export type FileBlock = HotspotBlockBase & {
  type: "file";
  /** `asset:<id>` from the library, or an http(s) URL / `{{token}}`. */
  src: string;
  /** Card title. Empty falls back to the asset file name (or the URL). */
  label: string;
};

export type IframeBlock = HotspotBlockBase & {
  type: "iframe";
  /** https:// page (or `{{token}}` resolving to one), embedded sandboxed. */
  url: string;
  /** Frame height in CSS px. */
  height: number;
  /** Show an "Open in new tab" link under the frame in Preview. Missing = off. */
  showOpenLink?: boolean;
};

export type DividerVariant = "line" | "dashed" | "space";

export type DividerBlock = HotspotBlockBase & {
  type: "divider";
  variant: DividerVariant;
};

export type CalloutTone = "neutral" | "info" | "success" | "warning" | "danger";

export type CalloutBlock = HotspotBlockBase & {
  type: "callout";
  /** Color preset (see `CALLOUT_TONES`). */
  tone: CalloutTone;
  /** CATEGORY_ICONS name. Missing = the tone's default icon. */
  icon?: string;
  /** Optional bold first line. Plain text with `{{tokens}}`. */
  title: string;
  /** Plain text with `{{tokens}}`; newlines are kept. */
  content: string;
};

export type HotspotBlock =
  | HeadingBlock
  | TextBlock
  | LinkBlock
  | ImageBlock
  | VideoBlock
  | ButtonBlock
  | FileBlock
  | IframeBlock
  | DividerBlock
  | CalloutBlock;
