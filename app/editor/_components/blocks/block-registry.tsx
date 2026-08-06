"use client";

import { ExternalLink, Heading, Type, type LucideIcon } from "lucide-react";
import type { ComponentType } from "react";
import { HeadingBlockEditor } from "@/app/editor/_components/blocks/heading-block-editor";
import { HeadingBlockPreview } from "@/app/editor/_components/blocks/heading-block-preview";
import { LinkBlockEditor } from "@/app/editor/_components/blocks/link-block-editor";
import { LinkBlockPreview } from "@/app/editor/_components/blocks/link-block-preview";
import { TextBlockEditor } from "@/app/editor/_components/blocks/text-block-editor";
import { TextBlockPreview } from "@/app/editor/_components/blocks/text-block-preview";
import { createBlock } from "@/lib/editor/blocks/create-block";
import type {
  HotspotBlock,
  HotspotBlockType,
} from "@/lib/editor/types/hotspot-block";

export type BlockEditorPatch = Partial<Omit<HotspotBlock, "id" | "type">>;

type BlockEditorProps = {
  block: HotspotBlock;
  onChange: (patch: BlockEditorPatch) => void;
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

function asBlockEditor(
  Editor: ComponentType<BlockEditorProps>,
): ComponentType<BlockEditorProps> {
  return Editor;
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
    Editor: asBlockEditor(function HeadingEditorAdapter({
      block,
      onChange,
      autoFocus,
    }) {
      if (block.type !== "heading") return null;
      return (
        <HeadingBlockEditor
          block={block}
          autoFocus={autoFocus}
          onChange={(content) => onChange({ content })}
        />
      );
    }),
    Preview: asBlockPreview(HeadingBlockPreview),
  },
  text: {
    type: "text",
    label: "Text",
    icon: Type,
    createDefault: () => createBlock("text"),
    Editor: asBlockEditor(function TextEditorAdapter({
      block,
      onChange,
      autoFocus,
    }) {
      if (block.type !== "text") return null;
      return (
        <TextBlockEditor
          block={block}
          autoFocus={autoFocus}
          onChange={(content) => onChange({ content })}
        />
      );
    }),
    Preview: asBlockPreview(TextBlockPreview),
  },
  link: {
    type: "link",
    label: "Link",
    icon: ExternalLink,
    createDefault: () => createBlock("link"),
    Editor: asBlockEditor(function LinkEditorAdapter({
      block,
      onChange,
      autoFocus,
    }) {
      if (block.type !== "link") return null;
      return (
        <LinkBlockEditor
          block={block}
          autoFocus={autoFocus}
          onChange={onChange}
        />
      );
    }),
    Preview: asBlockPreview(LinkBlockPreview),
  },
};

export const BLOCK_MENU_ITEMS = Object.values(BLOCK_REGISTRY);

export function getBlockDefinition(type: HotspotBlockType): BlockDefinition {
  return BLOCK_REGISTRY[type];
}
