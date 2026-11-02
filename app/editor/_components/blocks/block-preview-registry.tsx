"use client";

/**
 * Preview-only half of the block registry: what Preview and the public viewer
 * render for each block type. Kept separate from `block-registry.tsx` so the
 * viewer bundle never pulls in the block editors (asset picker, token fields,
 * icon picker, …). The editor registry reuses these components.
 */
import type { ComponentType } from "react";
import { ButtonBlockPreview } from "@/app/editor/_components/blocks/button-block-preview";
import { CalloutBlockPreview } from "@/app/editor/_components/blocks/callout-block-preview";
import { DividerBlockPreview } from "@/app/editor/_components/blocks/divider-block-preview";
import { FileBlockPreview } from "@/app/editor/_components/blocks/file-block-preview";
import { HeadingBlockPreview } from "@/app/editor/_components/blocks/heading-block-preview";
import { IframeBlockPreview } from "@/app/editor/_components/blocks/iframe-block-preview";
import { ImageBlockPreview } from "@/app/editor/_components/blocks/image-block-preview";
import { LinkBlockPreview } from "@/app/editor/_components/blocks/link-block-preview";
import { TextBlockPreview } from "@/app/editor/_components/blocks/text-block-preview";
import { VideoBlockPreview } from "@/app/editor/_components/blocks/video-block-preview";
import type {
  HotspotBlock,
  HotspotBlockType,
} from "@/lib/editor/types/hotspot-block";

export type BlockPreviewProps = {
  block: HotspotBlock;
  hotspotId?: number;
};

function asBlockPreview(
  Preview: ComponentType<BlockPreviewProps>,
): ComponentType<BlockPreviewProps> {
  return Preview;
}

export const BLOCK_PREVIEWS: Record<
  HotspotBlockType,
  ComponentType<BlockPreviewProps>
> = {
  heading: asBlockPreview(function HeadingPreviewAdapter({ block }) {
    if (block.type !== "heading") return null;
    return <HeadingBlockPreview block={block} />;
  }),
  text: asBlockPreview(function TextPreviewAdapter({ block, hotspotId }) {
    if (block.type !== "text") return null;
    return <TextBlockPreview block={block} hotspotId={hotspotId} />;
  }),
  link: asBlockPreview(function LinkPreviewAdapter({ block }) {
    if (block.type !== "link") return null;
    return <LinkBlockPreview block={block} />;
  }),
  image: asBlockPreview(function ImagePreviewAdapter({ block }) {
    if (block.type !== "image") return null;
    return <ImageBlockPreview block={block} />;
  }),
  video: asBlockPreview(function VideoPreviewAdapter({ block }) {
    if (block.type !== "video") return null;
    return <VideoBlockPreview block={block} />;
  }),
  button: asBlockPreview(function ButtonPreviewAdapter({ block, hotspotId }) {
    if (block.type !== "button") return null;
    return <ButtonBlockPreview block={block} hotspotId={hotspotId} />;
  }),
  file: asBlockPreview(function FilePreviewAdapter({ block }) {
    if (block.type !== "file") return null;
    return <FileBlockPreview block={block} />;
  }),
  iframe: asBlockPreview(function IframePreviewAdapter({ block }) {
    if (block.type !== "iframe") return null;
    return <IframeBlockPreview block={block} />;
  }),
  divider: asBlockPreview(function DividerPreviewAdapter({ block }) {
    if (block.type !== "divider") return null;
    return <DividerBlockPreview block={block} />;
  }),
  callout: asBlockPreview(function CalloutPreviewAdapter({ block }) {
    if (block.type !== "callout") return null;
    return <CalloutBlockPreview block={block} />;
  }),
};
