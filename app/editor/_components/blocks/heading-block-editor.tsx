"use client";

import type { HeadingBlock } from "@/lib/editor/types/hotspot-block";

type HeadingBlockEditorProps = {
  block: HeadingBlock;
  onChange: (content: string) => void;
  autoFocus?: boolean;
};

export function HeadingBlockEditor({
  block,
  onChange,
  autoFocus,
}: HeadingBlockEditorProps) {
  return (
    <input
      className="editor-input"
      placeholder="Heading…"
      value={block.content}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
