import { createEmptyActionGraph } from "@/lib/editor/actions/create-action-graph";
import { nextContentButtonOwnerId } from "@/lib/editor/blocks/content-buttons";
import { DEFAULT_CATEGORY_ICON } from "@/lib/editor/theme/category-icons";
import type {
  ButtonBlock,
  HeadingBlock,
  HotspotBlock,
  HotspotBlockType,
  ImageBlock,
  LinkBlock,
  TextBlock,
  VideoBlock,
} from "@/lib/editor/types/hotspot-block";

export function createBlockId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createBlock(type: "heading"): HeadingBlock;
export function createBlock(type: "text"): TextBlock;
export function createBlock(type: "link"): LinkBlock;
export function createBlock(type: "image"): ImageBlock;
export function createBlock(type: "video"): VideoBlock;
export function createBlock(type: "button"): ButtonBlock;
export function createBlock(type: HotspotBlockType): HotspotBlock;
export function createBlock(type: HotspotBlockType): HotspotBlock {
  switch (type) {
    case "heading":
      return { id: createBlockId(), type: "heading", content: "" };
    case "text":
      return { id: createBlockId(), type: "text", content: "" };
    case "link":
      return {
        id: createBlockId(),
        type: "link",
        label: "Open Link",
        url: "",
      };
    case "image":
      return { id: createBlockId(), type: "image", items: [] };
    case "video":
      return { id: createBlockId(), type: "video", url: "" };
    case "button":
      return {
        id: createBlockId(),
        type: "button",
        icon: DEFAULT_CATEGORY_ICON,
        label: "Action button",
        description: "",
        ownerId: nextContentButtonOwnerId(),
        actions: createEmptyActionGraph(),
      };
  }
}

export function createTextBlock(content: string): TextBlock {
  return { id: createBlockId(), type: "text", content };
}
