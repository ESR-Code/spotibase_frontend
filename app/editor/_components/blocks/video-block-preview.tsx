"use client";

import { Film } from "lucide-react";
import { hasFieldTokens } from "@/lib/editor/actions/interpolate-fields";
import { parseEmbedVideoUrl } from "@/lib/editor/blocks/embed-video-url";
import { useInterpolatedPlainText } from "@/lib/editor/blocks/use-interpolated-plain-text";
import type { VideoBlock } from "@/lib/editor/types/hotspot-block";

type VideoBlockPreviewProps = {
  block: VideoBlock;
};

const IFRAME_ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen";

export function VideoBlockPreview({ block }: VideoBlockPreviewProps) {
  const resolvedUrl = useInterpolatedPlainText(block.url).trim();
  const parsed = parseEmbedVideoUrl(resolvedUrl);
  const pendingToken = hasFieldTokens(block.url);

  if (parsed) {
    return (
      <div className="editor-video-block">
        <iframe
          className="editor-video-block-frame"
          src={parsed.embedUrl}
          title={parsed.provider === "youtube" ? "YouTube video" : "Vimeo video"}
          allow={IFRAME_ALLOW}
          allowFullScreen
        />
      </div>
    );
  }

  if (!block.url.trim()) return null;

  return (
    <div className="editor-video-block-empty">
      <Film className="h-4 w-4" />
      {pendingToken && !resolvedUrl
        ? "Video (URL not resolved yet)"
        : "Video (enter a YouTube or Vimeo URL)"}
    </div>
  );
}
