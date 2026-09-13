"use client";

import { TokenField } from "@/app/editor/_components/blocks/token-field";
import type { HttpFieldSource } from "@/lib/editor/blocks/http-field-sources";
import {
  embedVideoUrlHasTokens,
  parseEmbedVideoUrl,
} from "@/lib/editor/blocks/embed-video-url";
import type { VideoBlock } from "@/lib/editor/types/hotspot-block";

type VideoBlockEditorProps = {
  block: VideoBlock;
  onChange: (patch: Pick<VideoBlock, "url">) => void;
  autoFocus?: boolean;
  fieldSources?: HttpFieldSource[];
};

export function VideoBlockEditor({
  block,
  onChange,
  autoFocus,
  fieldSources,
}: VideoBlockEditorProps) {
  const trimmed = block.url.trim();
  const parsed = parseEmbedVideoUrl(block.url);
  const hasTokens = embedVideoUrlHasTokens(block.url);

  let hint = "YouTube or Vimeo link. Uploads are not supported.";
  let hintTone: "muted" | "ok" | "warn" = "muted";
  if (trimmed) {
    if (parsed) {
      hint =
        parsed.provider === "youtube"
          ? "YouTube video — plays in Preview"
          : "Vimeo video — plays in Preview";
      hintTone = "ok";
    } else if (hasTokens) {
      hint = "Uses tokens — the URL is checked in Preview";
    } else {
      hint = "Enter a YouTube or Vimeo URL";
      hintTone = "warn";
    }
  }

  return (
    <div className="space-y-1.5">
      <label className="block">
        <span
          className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--editor-muted-2)" }}
        >
          Video URL
        </span>
        <TokenField
          value={block.url}
          type="url"
          placeholder="https://youtube.com/watch?v=… or vimeo.com/…"
          autoFocus={autoFocus}
          sources={fieldSources}
          onChange={(url) => onChange({ url })}
        />
      </label>
      <div
        className="text-[11px]"
        style={{
          color:
            hintTone === "warn"
              ? "var(--editor-amber)"
              : hintTone === "ok"
                ? "var(--editor-muted)"
                : "var(--editor-muted)",
        }}
      >
        {hint}
      </div>
    </div>
  );
}
