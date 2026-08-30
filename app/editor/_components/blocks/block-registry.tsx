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
import type { HttpFieldSource } from "@/lib/editor/blocks/http-field-sources";
import type {
  HotspotBlock,
  HotspotBlockType,
} from "@/lib/editor/types/hotspot-block";

export type BlockEditorPatch = Partial<Omit<HotspotBlock, "id" | "type">>;

type BlockEditorProps = {
  block: HotspotBlock;
  onChange: (patch: BlockEditorPatch) => void;
  autoFocus?: boolean;
  hotspotId?: number;
  fieldSources?: HttpFieldSource[];
};

type BlockPreviewProps = {
  block: HotspotBlock;
  hotspotId?: number;
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

function asBlockPreview(
  Preview: ComponentType<BlockPreviewProps>,
): ComponentType<BlockPreviewProps> {
  return Preview;
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
      fieldSources,
    }) {
      if (block.type !== "heading") return null;
      return (
        <HeadingBlockEditor
          block={block}
          autoFocus={autoFocus}
          fieldSources={fieldSources}
          onChange={(content) => onChange({ content })}
        />
      );
    }),
    Preview: asBlockPreview(function HeadingPreviewAdapter({ block }) {
      if (block.type !== "heading") return null;
      return <HeadingBlockPreview block={block} />;
    }),
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
      hotspotId,
      fieldSources,
    }) {
      if (block.type !== "text") return null;
      return (
        <TextBlockEditor
          block={block}
          autoFocus={autoFocus}
          hotspotId={hotspotId}
          fieldSources={fieldSources}
          onChange={(content) => onChange({ content })}
        />
      );
    }),
    Preview: asBlockPreview(function TextPreviewAdapter({ block, hotspotId }) {
      if (block.type !== "text") return null;
      return <TextBlockPreview block={block} hotspotId={hotspotId} />;
    }),
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
      fieldSources,
    }) {
      if (block.type !== "link") return null;
      return (
        <LinkBlockEditor
          block={block}
          autoFocus={autoFocus}
          fieldSources={fieldSources}
          onChange={onChange}
        />
      );
    }),
    Preview: asBlockPreview(function LinkPreviewAdapter({ block }) {
      if (block.type !== "link") return null;
      return <LinkBlockPreview block={block} />;
    }),
  },
};

export const BLOCK_MENU_ITEMS = Object.values(BLOCK_REGISTRY);

export function getBlockDefinition(type: HotspotBlockType): BlockDefinition {
  return BLOCK_REGISTRY[type];
}
