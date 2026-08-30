"use client";

import { TokenField } from "@/app/editor/_components/blocks/token-field";
import type { HttpFieldSource } from "@/lib/editor/blocks/http-field-sources";
import type { LinkBlock } from "@/lib/editor/types/hotspot-block";

type LinkBlockEditorProps = {
  block: LinkBlock;
  onChange: (patch: Partial<Pick<LinkBlock, "label" | "url">>) => void;
  autoFocus?: boolean;
  fieldSources?: HttpFieldSource[];
};

export function LinkBlockEditor({
  block,
  onChange,
  autoFocus,
  fieldSources,
}: LinkBlockEditorProps) {
  return (
    <div className="space-y-2.5">
      <label className="block">
        <span
          className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--editor-muted-2)" }}
        >
          Button text
        </span>
        <TokenField
          value={block.label}
          placeholder="Open Link"
          autoFocus={autoFocus}
          sources={fieldSources}
          onChange={(label) => onChange({ label })}
        />
      </label>
      <label className="block">
        <span
          className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--editor-muted-2)" }}
        >
          URL
        </span>
        <TokenField
          value={block.url}
          type="url"
          placeholder="https://…"
          sources={fieldSources}
          onChange={(url) => onChange({ url })}
        />
      </label>
    </div>
  );
}
