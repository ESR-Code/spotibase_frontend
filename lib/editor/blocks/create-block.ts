import type {
  HeadingBlock,
  HotspotBlock,
  HotspotBlockType,
  TextBlock,
} from "@/lib/editor/types/hotspot-block";

function newBlockId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createBlock(type: "heading"): HeadingBlock;
export function createBlock(type: "text"): TextBlock;
export function createBlock(type: HotspotBlockType): HotspotBlock;
export function createBlock(type: HotspotBlockType): HotspotBlock {
  switch (type) {
    case "heading":
      return { id: newBlockId(), type: "heading", content: "" };
    case "text":
      return { id: newBlockId(), type: "text", content: "" };
  }
}

export function createTextBlock(content: string): TextBlock {
  return { id: newBlockId(), type: "text", content };
}
