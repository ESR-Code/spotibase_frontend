"use client";

import { AppWindow, ExternalLink } from "lucide-react";
import { hasFieldTokens } from "@/lib/editor/actions/interpolate-fields";
import {
  IFRAME_BLOCK_HEIGHT,
  IFRAME_BLOCK_SANDBOX,
  parseIframeUrl,
} from "@/lib/editor/blocks/embed-iframe-url";
import { useInterpolatedPlainText } from "@/lib/editor/blocks/use-interpolated-plain-text";
import type { IframeBlock } from "@/lib/editor/types/hotspot-block";

type IframeBlockPreviewProps = {
  block: IframeBlock;
};

export function IframeBlockPreview({ block }: IframeBlockPreviewProps) {
  const resolvedUrl = useInterpolatedPlainText(block.url).trim();
  const src = parseIframeUrl(resolvedUrl);

  if (!src) {
    if (!block.url.trim()) return null;
    return (
      <div className="editor-video-block-empty">
        <AppWindow className="h-4 w-4" />
        {hasFieldTokens(block.url) && !resolvedUrl
          ? "Embed (URL not resolved yet)"
          : "Embed (enter an https:// URL)"}
      </div>
    );
  }

  const height = Math.min(
    IFRAME_BLOCK_HEIGHT.max,
    Math.max(IFRAME_BLOCK_HEIGHT.min, block.height || IFRAME_BLOCK_HEIGHT.default),
  );

  return (
    <div className="editor-iframe-block">
      <iframe
        className="editor-iframe-block-frame"
        src={src}
        title="Embedded page"
        style={{ height }}
        sandbox={IFRAME_BLOCK_SANDBOX}
        allow="fullscreen; clipboard-write"
        referrerPolicy="strict-origin-when-cross-origin"
        loading="lazy"
      />
      {block.showOpenLink ? (
        <a
          className="editor-iframe-block-open"
          href={src}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink className="h-3 w-3" />
          Open in new tab
        </a>
      ) : null}
    </div>
  );
}
