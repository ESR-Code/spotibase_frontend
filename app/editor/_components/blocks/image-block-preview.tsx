"use client";

import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import {
  hasFieldTokens,
  interpolatePlainText,
} from "@/lib/editor/actions/interpolate-fields";
import { useLiveFieldInterpolation } from "@/lib/editor/blocks/use-interpolated-plain-text";
import type { ImageBlock } from "@/lib/editor/types/hotspot-block";

type ImageBlockPreviewProps = {
  block: ImageBlock;
  hotspotId?: number;
};

function isDisplayableSrc(src: string): boolean {
  const value = src.trim();
  if (!value || hasFieldTokens(value)) return false;
  return (
    value.startsWith("data:image/") ||
    value.startsWith("blob:") ||
    value.startsWith("//") ||
    value.startsWith("/") ||
    /^https?:\/\//i.test(value)
  );
}

function SlideFigure({
  src,
  caption,
}: {
  src: string;
  caption: string;
}) {
  const trimmed = caption.trim();
  return (
    <figure className="editor-image-block m-0">
      <div className="editor-image-block-frame">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={trimmed} className="editor-image-block-img" />
      </div>
      {trimmed ? (
        <figcaption className="editor-image-block-caption">{trimmed}</figcaption>
      ) : null}
    </figure>
  );
}

export function ImageBlockPreview({ block }: ImageBlockPreviewProps) {
  useLiveFieldInterpolation();

  const items = block.items.flatMap((item) => {
    const src = interpolatePlainText(item.src).trim();
    const caption = interpolatePlainText(item.caption);
    if (!isDisplayableSrc(src)) return [];
    return [{ id: item.id, src, caption }];
  });

  const pendingToken = block.items.some(
    (item) => hasFieldTokens(item.src) || hasFieldTokens(item.caption),
  );
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [block.id, items.length]);

  useEffect(() => {
    if (index >= items.length) setIndex(0);
  }, [index, items.length]);

  if (items.length === 0) {
    if (!pendingToken) return null;
    return (
      <div className="editor-image-block-empty">
        <ImageIcon className="h-4 w-4" />
        Image (URL not resolved yet)
      </div>
    );
  }

  if (items.length === 1) {
    return <SlideFigure src={items[0].src} caption={items[0].caption} />;
  }

  const current = items[index] ?? items[0];
  const goPrev = () =>
    setIndex((prev) => (prev - 1 + items.length) % items.length);
  const goNext = () => setIndex((prev) => (prev + 1) % items.length);

  return (
    <div className="editor-image-block-carousel">
      <SlideFigure src={current.src} caption={current.caption} />
      <div className="editor-image-block-nav">
        <EditorButton
          type="button"
          variant="ghost"
          className="text-[12px]"
          onClick={goPrev}
        >
          <ChevronLeft className="h-3 w-3" />
          Prev
        </EditorButton>
        <span className="editor-image-block-count">
          {index + 1} / {items.length}
        </span>
        <EditorButton
          type="button"
          variant="ghost"
          className="text-[12px]"
          onClick={goNext}
        >
          Next
          <ChevronRight className="h-3 w-3" />
        </EditorButton>
      </div>
    </div>
  );
}
