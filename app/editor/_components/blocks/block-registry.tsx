"use client";

import { Heading, Type, type LucideIcon } from "lucide-react";
import type { ComponentType } from "react";
import { HeadingBlockEditor } from "@/app/editor/_components/blocks/heading-block-editor";
import { HeadingBlockPreview } from "@/app/editor/_components/blocks/heading-block-preview";
import { TextBlockEditor } from "@/app/editor/_components/blocks/text-block-editor";
import { TextBlockPreview } from "@/app/editor/_components/blocks/text-block-preview";
import { createBlock } from "@/lib/editor/blocks/create-block";
import type {
  HotspotBlock,
  HotspotBlockType,
} from "@/lib/editor/types/hotspot-block";

type BlockEditorProps = {
  block: HotspotBlock;
  onChange: (content: string) => void;
  autoFocus?: boolean;
};

type BlockPreviewProps = {
  block: HotspotBlock;
};

export type BlockDefinition = {
  type: HotspotBlockType;
  label: string;
  icon: LucideIcon;
  createDefault: () => HotspotBlock;
  Editor: ComponentType<BlockEditorProps>;
  Preview: ComponentType<BlockPreviewProps>;
};

function asBlockEditor<T extends HotspotBlock>(
  Editor: ComponentType<{
    block: T;
    onChange: (content: string) => void;
    autoFocus?: boolean;
  }>,
): ComponentType<BlockEditorProps> {
  return Editor as ComponentType<BlockEditorProps>;
}

function asBlockPreview<T extends HotspotBlock>(
  Preview: ComponentType<{ block: T }>,
): ComponentType<BlockPreviewProps> {
  return Preview as ComponentType<BlockPreviewProps>;
}

export const BLOCK_REGISTRY: Record<HotspotBlockType, BlockDefinition> = {
  heading: {
    type: "heading",
    label: "Heading",
    icon: Heading,
    createDefault: () => createBlock("heading"),
    Editor: asBlockEditor(HeadingBlockEditor),
    Preview: asBlockPreview(HeadingBlockPreview),
  },
  text: {
    type: "text",
    label: "Text",
    icon: Type,
    createDefault: () => createBlock("text"),
    Editor: asBlockEditor(TextBlockEditor),
    Preview: asBlockPreview(TextBlockPreview),
  },
};

export const BLOCK_MENU_ITEMS = Object.values(BLOCK_REGISTRY);

export function getBlockDefinition(type: HotspotBlockType): BlockDefinition {
  return BLOCK_REGISTRY[type];
}
