export type HotspotBlockType = "heading" | "text" | "link" | "image" | "video";

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

export type HotspotBlock =
  | HeadingBlock
  | TextBlock
  | LinkBlock
  | ImageBlock
  | VideoBlock;
