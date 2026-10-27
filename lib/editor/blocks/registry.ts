import { createBlock } from "@/lib/editor/blocks/create-block";
import type { HotspotBlockType } from "@/lib/editor/types/hotspot-block";

/** Non-UI block metadata for menus and future non-React consumers. */
export const BLOCK_TYPE_META: Record<
  HotspotBlockType,
  {
    type: HotspotBlockType;
    label: string;
    createDefault: () => ReturnType<typeof createBlock>;
  }
> = {
  heading: {
    type: "heading",
    label: "Heading",
    createDefault: () => createBlock("heading"),
  },
  text: {
    type: "text",
    label: "Text",
    createDefault: () => createBlock("text"),
  },
  link: {
    type: "link",
    label: "Link",
    createDefault: () => createBlock("link"),
  },
  image: {
    type: "image",
    label: "Image",
    createDefault: () => createBlock("image"),
  },
  video: {
    type: "video",
    label: "Video",
    createDefault: () => createBlock("video"),
  },
  button: {
    type: "button",
    label: "Action button",
    createDefault: () => createBlock("button"),
  },
  file: {
    type: "file",
    label: "File",
    createDefault: () => createBlock("file"),
  },
  iframe: {
    type: "iframe",
    label: "Embed (iframe)",
    createDefault: () => createBlock("iframe"),
  },
  divider: {
    type: "divider",
    label: "Divider",
    createDefault: () => createBlock("divider"),
  },
  callout: {
    type: "callout",
    label: "Callout",
    createDefault: () => createBlock("callout"),
  },
};

export const BLOCK_TYPE_LIST = Object.values(BLOCK_TYPE_META);
