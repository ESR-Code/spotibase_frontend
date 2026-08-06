"use client";

import type { LinkBlock } from "@/lib/editor/types/hotspot-block";

type LinkBlockEditorProps = {
  block: LinkBlock;
  onChange: (patch: Partial<Pick<LinkBlock, "label" | "url">>) => void;
  autoFocus?: boolean;
};

export function LinkBlockEditor({
  block,
  onChange,
  autoFocus,
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
        <input
          className="editor-input"
          placeholder="Open Link"
          value={block.label}
          autoFocus={autoFocus}
          onChange={(e) => onChange({ label: e.target.value })}
        />
      </label>
      <label className="block">
        <span
          className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--editor-muted-2)" }}
        >
          URL
        </span>
        <input
          className="editor-input"
          type="url"
          placeholder="https://…"
          value={block.url}
          onChange={(e) => onChange({ url: e.target.value })}
        />
      </label>
    </div>
  );
}
