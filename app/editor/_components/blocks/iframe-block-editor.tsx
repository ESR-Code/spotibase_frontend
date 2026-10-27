"use client";

import { TokenField } from "@/app/editor/_components/blocks/token-field";
import { CheckboxField } from "@/app/editor/_components/ui/checkbox-field";
import { FieldLabel } from "@/app/editor/_components/ui/field-label";
import { hasFieldTokens } from "@/lib/editor/actions/interpolate-fields";
import {
  IFRAME_BLOCK_HEIGHT,
  iframeUrlError,
} from "@/lib/editor/blocks/embed-iframe-url";
import type { HttpFieldSource } from "@/lib/editor/blocks/http-field-sources";
import { useInterpolatedPlainText } from "@/lib/editor/blocks/use-interpolated-plain-text";
import type { IframeBlock } from "@/lib/editor/types/hotspot-block";

type IframeBlockEditorProps = {
  block: IframeBlock;
  onChange: (patch: Partial<Pick<IframeBlock, "url" | "height" | "showOpenLink">>) => void;
  autoFocus?: boolean;
  fieldSources?: HttpFieldSource[];
};

export function IframeBlockEditor({
  block,
  onChange,
  autoFocus,
  fieldSources,
}: IframeBlockEditorProps) {
  const hasTokens = hasFieldTokens(block.url);
  const resolvedUrl = useInterpolatedPlainText(block.url).trim();

  let hint =
    "Some sites refuse to be embedded. Turn on “Show Open in new tab link” below as a fallback.";
  let warn = false;
  if (block.url.trim()) {
    if (hasTokens && !resolvedUrl) {
      hint = "Uses tokens — waiting for an https:// URL";
    } else {
      const error = iframeUrlError(hasTokens ? resolvedUrl : block.url);
      if (error) {
        hint = hasTokens ? `Resolved URL: ${error}` : error;
        warn = true;
      }
    }
  }

  return (
    <div className="space-y-2.5">
      <label className="block">
        <FieldLabel className="mb-1">Page URL</FieldLabel>
        <TokenField
          value={block.url}
          type="url"
          placeholder="https://…"
          autoFocus={autoFocus}
          sources={fieldSources}
          onChange={(url) => onChange({ url })}
        />
      </label>
      <div
        className="text-[11px]"
        style={{ color: warn ? "var(--editor-amber)" : "var(--editor-muted)" }}
      >
        {hint}
      </div>
      <label className="block">
        <FieldLabel className="mb-1">Height (px)</FieldLabel>
        <input
          className="editor-input"
          type="number"
          min={IFRAME_BLOCK_HEIGHT.min}
          max={IFRAME_BLOCK_HEIGHT.max}
          step={20}
          value={block.height}
          onChange={(e) => {
            const next = Number(e.target.value);
            if (Number.isFinite(next)) onChange({ height: next });
          }}
          onBlur={() =>
            onChange({
              height: Math.min(
                IFRAME_BLOCK_HEIGHT.max,
                Math.max(IFRAME_BLOCK_HEIGHT.min, Math.round(block.height) || IFRAME_BLOCK_HEIGHT.default),
              ),
            })
          }
        />
      </label>
      <CheckboxField
        label="Show “Open in new tab” link"
        description="Adds a link under the frame in Preview."
        checked={Boolean(block.showOpenLink)}
        onChange={(showOpenLink) => onChange({ showOpenLink })}
      />
    </div>
  );
}
