export type HotspotBlockType = "heading" | "text" | "link";

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

export type HotspotBlock = HeadingBlock | TextBlock | LinkBlock;
