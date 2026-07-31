export type HotspotBlockType = "heading" | "text";

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

export type HotspotBlock = HeadingBlock | TextBlock;
