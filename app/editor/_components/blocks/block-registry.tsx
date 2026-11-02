"use client";

import { assetIdFromRef, isAssetRef } from "@/lib/editor/assets/types";
import { useAssetsStore } from "@/lib/editor/assets/assets-store";
import {
  AppWindow,
  ExternalLink,
  FileText,
  Film,
  Heading,
  ImageIcon,
  Megaphone,
  SeparatorHorizontal,
  Type,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { ComponentType } from "react";
import { ButtonBlockEditor } from "@/app/editor/_components/blocks/button-block-editor";
import { CalloutBlockEditor } from "@/app/editor/_components/blocks/callout-block-editor";
import {
  DIVIDER_VARIANT_OPTIONS,
  DividerBlockEditor,
} from "@/app/editor/_components/blocks/divider-block-editor";
import { FileBlockEditor } from "@/app/editor/_components/blocks/file-block-editor";
import { HeadingBlockEditor } from "@/app/editor/_components/blocks/heading-block-editor";
import { IframeBlockEditor } from "@/app/editor/_components/blocks/iframe-block-editor";
import { ImageBlockEditor } from "@/app/editor/_components/blocks/image-block-editor";
import { LinkBlockEditor } from "@/app/editor/_components/blocks/link-block-editor";
import { TextBlockEditor } from "@/app/editor/_components/blocks/text-block-editor";
import { VideoBlockEditor } from "@/app/editor/_components/blocks/video-block-editor";
import {
  BLOCK_PREVIEWS,
  type BlockPreviewProps,
} from "@/app/editor/_components/blocks/block-preview-registry";
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

export const BLOCK_REGISTRY: Record<HotspotBlockType, BlockDefinition> = {
  heading: {
    type: "heading",
    label: "Heading",
    icon: Heading,
    createDefault: () => createBlock("heading"),
    Preview: BLOCK_PREVIEWS.heading,
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
  },
  text: {
    type: "text",
    label: "Text",
    icon: Type,
    createDefault: () => createBlock("text"),
    Preview: BLOCK_PREVIEWS.text,
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
  },
  link: {
    type: "link",
    label: "Link",
    icon: ExternalLink,
    createDefault: () => createBlock("link"),
    Preview: BLOCK_PREVIEWS.link,
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
  },
  image: {
    type: "image",
    label: "Image",
    icon: ImageIcon,
    createDefault: () => createBlock("image"),
    Preview: BLOCK_PREVIEWS.image,
    collapsedPreview: (block) => {
      if (block.type !== "image") return "";
      const count = block.items.length;
      if (count === 0) return "No images";
      if (count === 1) {
        const src = block.items[0]?.src.trim() ?? "";
        if (!src || src.startsWith("data:") || isAssetRef(src)) return "1 image";
        return src;
      }
      return `${count} images`;
    },
    Editor: asBlockEditor(function ImageEditorAdapter({
      block,
      onChange,
      fieldSources,
    }) {
      if (block.type !== "image") return null;
      return (
        <ImageBlockEditor
          block={block}
          fieldSources={fieldSources}
          onChange={(patch) => onChange(patch)}
        />
      );
    }),
  },
  video: {
    type: "video",
    label: "Video",
    icon: Film,
    createDefault: () => createBlock("video"),
    Preview: BLOCK_PREVIEWS.video,
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
  },
  button: {
    type: "button",
    label: "Action button",
    icon: Zap,
    createDefault: () => createBlock("button"),
    Preview: BLOCK_PREVIEWS.button,
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
  },
  file: {
    type: "file",
    label: "File",
    icon: FileText,
    createDefault: () => createBlock("file"),
    Preview: BLOCK_PREVIEWS.file,
    collapsedPreview: (block) => {
      if (block.type !== "file") return "";
      if (block.label.trim()) return block.label.trim();
      const assetId = assetIdFromRef(block.src);
      if (assetId) {
        return useAssetsStore.getState().assets[assetId]?.name ?? "Missing file";
      }
      return block.src.trim() || "No file";
    },
    Editor: asBlockEditor(function FileEditorAdapter({
      block,
      onChange,
      autoFocus,
      fieldSources,
    }) {
      if (block.type !== "file") return null;
      return (
        <FileBlockEditor
          block={block}
          autoFocus={autoFocus}
          fieldSources={fieldSources}
          onChange={onChange}
        />
      );
    }),
  },
  iframe: {
    type: "iframe",
    label: "Embed (iframe)",
    icon: AppWindow,
    createDefault: () => createBlock("iframe"),
    Preview: BLOCK_PREVIEWS.iframe,
    collapsedPreview: (block) =>
      block.type === "iframe" ? block.url.trim() || "No URL" : "",
    Editor: asBlockEditor(function IframeEditorAdapter({
      block,
      onChange,
      autoFocus,
      fieldSources,
    }) {
      if (block.type !== "iframe") return null;
      return (
        <IframeBlockEditor
          block={block}
          autoFocus={autoFocus}
          fieldSources={fieldSources}
          onChange={onChange}
        />
      );
    }),
  },
  divider: {
    type: "divider",
    label: "Divider",
    icon: SeparatorHorizontal,
    createDefault: () => createBlock("divider"),
    Preview: BLOCK_PREVIEWS.divider,
    collapsedPreview: (block) =>
      block.type === "divider"
        ? (DIVIDER_VARIANT_OPTIONS.find((option) => option.id === block.variant)
            ?.label ?? "Line")
        : "",
    Editor: asBlockEditor(function DividerEditorAdapter({ block, onChange }) {
      if (block.type !== "divider") return null;
      return <DividerBlockEditor block={block} onChange={onChange} />;
    }),
  },
  callout: {
    type: "callout",
    label: "Callout",
    icon: Megaphone,
    createDefault: () => createBlock("callout"),
    Preview: BLOCK_PREVIEWS.callout,
    collapsedPreview: (block) =>
      block.type === "callout"
        ? block.title.trim() || block.content.trim() || "Empty callout"
        : "",
    Editor: asBlockEditor(function CalloutEditorAdapter({
      block,
      onChange,
      autoFocus,
      fieldSources,
    }) {
      if (block.type !== "callout") return null;
      return (
        <CalloutBlockEditor
          block={block}
          autoFocus={autoFocus}
          fieldSources={fieldSources}
          onChange={onChange}
        />
      );
    }),
  },
};

export const BLOCK_MENU_ITEMS = Object.values(BLOCK_REGISTRY);

export function getBlockDefinition(type: HotspotBlockType): BlockDefinition {
  return BLOCK_REGISTRY[type];
}
