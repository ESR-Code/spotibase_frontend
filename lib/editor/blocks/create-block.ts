import { createEmptyActionGraph } from "@/lib/editor/actions/create-action-graph";
import { DEFAULT_BUTTON_BLOCK_COLOR } from "@/lib/editor/blocks/button-colors";
import { IFRAME_BLOCK_HEIGHT } from "@/lib/editor/blocks/embed-iframe-url";
import {
  cloneButtonBlock,
  nextContentButtonOwnerId,
} from "@/lib/editor/blocks/content-buttons";
import { DEFAULT_CATEGORY_ICON } from "@/lib/editor/theme/category-icons";
import type {
  ButtonBlock,
  CalloutBlock,
  DividerBlock,
  FileBlock,
  HeadingBlock,
  HotspotBlock,
  HotspotBlockType,
  IframeBlock,
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
export function createBlock(type: "file"): FileBlock;
export function createBlock(type: "iframe"): IframeBlock;
export function createBlock(type: "divider"): DividerBlock;
export function createBlock(type: "callout"): CalloutBlock;
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
        color: DEFAULT_BUTTON_BLOCK_COLOR,
        ownerId: nextContentButtonOwnerId(),
        actions: createEmptyActionGraph(),
      };
    case "file":
      return { id: createBlockId(), type: "file", src: "", label: "" };
    case "iframe":
      return {
        id: createBlockId(),
        type: "iframe",
        url: "",
        height: IFRAME_BLOCK_HEIGHT.default,
      };
    case "divider":
      return { id: createBlockId(), type: "divider", variant: "line" };
    case "callout":
      return {
        id: createBlockId(),
        type: "callout",
        tone: "neutral",
        title: "",
        content: "",
      };
  }
}

/**
 * Copy of `block` placed right after it: new block id, new image slide ids,
 * and for Action buttons a new canvas owner (fresh node ids, free lane).
 */
export function duplicateBlock(block: HotspotBlock): HotspotBlock {
  if (block.type === "button") {
    return { ...cloneButtonBlock(block, true), id: createBlockId() };
  }
  if (block.type === "image") {
    return {
      ...block,
      id: createBlockId(),
      items: block.items.map((item) => ({ ...item, id: createBlockId() })),
    };
  }
  return { ...block, id: createBlockId() };
}

export function createTextBlock(content: string): TextBlock {
  return { id: createBlockId(), type: "text", content };
}
