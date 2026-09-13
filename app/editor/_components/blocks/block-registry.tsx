"use client";

import {
  ExternalLink,
  Film,
  Heading,
  ImageIcon,
  Type,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { ComponentType } from "react";
import { ButtonBlockEditor } from "@/app/editor/_components/blocks/button-block-editor";
import { ButtonBlockPreview } from "@/app/editor/_components/blocks/button-block-preview";
import { HeadingBlockEditor } from "@/app/editor/_components/blocks/heading-block-editor";
import { HeadingBlockPreview } from "@/app/editor/_components/blocks/heading-block-preview";
import { ImageBlockEditor } from "@/app/editor/_components/blocks/image-block-editor";
import { ImageBlockPreview } from "@/app/editor/_components/blocks/image-block-preview";
import { LinkBlockEditor } from "@/app/editor/_components/blocks/link-block-editor";
import { LinkBlockPreview } from "@/app/editor/_components/blocks/link-block-preview";
import { TextBlockEditor } from "@/app/editor/_components/blocks/text-block-editor";
import { TextBlockPreview } from "@/app/editor/_components/blocks/text-block-preview";
import { VideoBlockEditor } from "@/app/editor/_components/blocks/video-block-editor";
import { VideoBlockPreview } from "@/app/editor/_components/blocks/video-block-preview";
import { createBlock } from "@/lib/editor/blocks/create-block";
import type { HttpFieldSource } from "@/lib/editor/blocks/http-field-sources";
import { richTextToPlainPreview } from "@/lib/editor/blocks/rich-text";
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
  collapsedPreview: (block: HotspotBlock) => string;
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
    collapsedPreview: (block) =>
      block.type === "heading" ? block.content.trim() || "Empty heading" : "",
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
    collapsedPreview: (block) =>
      block.type === "text"
        ? richTextToPlainPreview(block.content) || "Empty text"
        : "",
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
    collapsedPreview: (block) =>
      block.type === "link"
        ? block.label.trim() || block.url.trim() || "Empty link"
        : "",
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
  image: {
    type: "image",
    label: "Image",
    icon: ImageIcon,
    createDefault: () => createBlock("image"),
    collapsedPreview: (block) => {
      if (block.type !== "image") return "";
      const count = block.items.length;
      if (count === 0) return "No images";
      return count === 1 ? "1 image" : `${count} images`;
    },
    Editor: asBlockEditor(function ImageEditorAdapter({ block, onChange }) {
      if (block.type !== "image") return null;
      return (
        <ImageBlockEditor
          block={block}
          onChange={(patch) => onChange(patch)}
        />
      );
    }),
    Preview: asBlockPreview(function ImagePreviewAdapter({ block }) {
      if (block.type !== "image") return null;
      return <ImageBlockPreview block={block} />;
    }),
  },
  video: {
    type: "video",
    label: "Video",
    icon: Film,
    createDefault: () => createBlock("video"),
    collapsedPreview: (block) =>
      block.type === "video" ? block.url.trim() || "No video" : "",
    Editor: asBlockEditor(function VideoEditorAdapter({
      block,
      onChange,
      autoFocus,
      fieldSources,
    }) {
      if (block.type !== "video") return null;
      return (
        <VideoBlockEditor
          block={block}
          autoFocus={autoFocus}
          fieldSources={fieldSources}
          onChange={(patch) => onChange(patch)}
        />
      );
    }),
    Preview: asBlockPreview(function VideoPreviewAdapter({ block }) {
      if (block.type !== "video") return null;
      return <VideoBlockPreview block={block} />;
    }),
  },
  button: {
    type: "button",
    label: "Action button",
    icon: Zap,
    createDefault: () => createBlock("button"),
    collapsedPreview: (block) =>
      block.type === "button" ? block.label.trim() || "Action button" : "",
    Editor: asBlockEditor(function ButtonEditorAdapter({
      block,
      onChange,
      autoFocus,
      fieldSources,
    }) {
      if (block.type !== "button") return null;
      return (
        <ButtonBlockEditor
          block={block}
          autoFocus={autoFocus}
          fieldSources={fieldSources}
          onChange={onChange}
        />
      );
    }),
    Preview: asBlockPreview(function ButtonPreviewAdapter({ block, hotspotId }) {
      if (block.type !== "button") return null;
      return <ButtonBlockPreview block={block} hotspotId={hotspotId} />;
    }),
  },
};

export const BLOCK_MENU_ITEMS = Object.values(BLOCK_REGISTRY);

export function getBlockDefinition(type: HotspotBlockType): BlockDefinition {
  return BLOCK_REGISTRY[type];
}
