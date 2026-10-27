"use client";

import type { DividerBlock } from "@/lib/editor/types/hotspot-block";

export function DividerBlockPreview({ block }: { block: DividerBlock }) {
  if (block.variant === "space") {
    return <div className="editor-divider-block-space" aria-hidden />;
  }
  return <hr className="editor-divider-block" data-variant={block.variant} />;
}
