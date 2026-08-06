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
};

export const BLOCK_TYPE_LIST = Object.values(BLOCK_TYPE_META);
