"use client";

import { TokenField } from "@/app/editor/_components/blocks/token-field";
import type { HttpFieldSource } from "@/lib/editor/blocks/http-field-sources";
import type { HeadingBlock } from "@/lib/editor/types/hotspot-block";

type HeadingBlockEditorProps = {
  block: HeadingBlock;
  onChange: (content: string) => void;
  autoFocus?: boolean;
  fieldSources?: HttpFieldSource[];
};

export function HeadingBlockEditor({
  block,
  onChange,
  autoFocus,
  fieldSources,
}: HeadingBlockEditorProps) {
  return (
    <TokenField
      value={block.content}
      placeholder="Heading…"
      autoFocus={autoFocus}
      sources={fieldSources}
      onChange={onChange}
    />
  );
}
