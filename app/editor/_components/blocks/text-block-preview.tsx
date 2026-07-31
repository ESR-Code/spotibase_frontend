"use client";

import { normalizeRichTextContent } from "@/lib/editor/blocks/rich-text";
import type { TextBlock } from "@/lib/editor/types/hotspot-block";

type TextBlockPreviewProps = {
  block: TextBlock;
};

export function TextBlockPreview({ block }: TextBlockPreviewProps) {
  const html = normalizeRichTextContent(block.content);
  if (!html) return null;

  return (
    <div
      className="editor-rich-text-preview text-[14px] leading-relaxed"
      style={{ color: "var(--editor-muted)" }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
