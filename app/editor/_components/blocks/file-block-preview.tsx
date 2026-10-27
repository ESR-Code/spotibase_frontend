"use client";

import { Download, ExternalLink, FileText } from "lucide-react";
import { hasFieldTokens } from "@/lib/editor/actions/interpolate-fields";
import { useFileBlockTarget } from "@/lib/editor/blocks/file-block";
import type { FileBlock } from "@/lib/editor/types/hotspot-block";

type FileBlockPreviewProps = {
  block: FileBlock;
};

export function FileBlockPreview({ block }: FileBlockPreviewProps) {
  const target = useFileBlockTarget(block);

  if (!target) {
    if (!block.src.trim()) return null;
    return (
      <div className="editor-video-block-empty">
        <FileText className="h-4 w-4" />
        {hasFieldTokens(block.src) ? "File (URL not resolved yet)" : "File unavailable"}
      </div>
    );
  }

  const isDownload = target.downloadName != null;

  return (
    <a
      className="editor-file-block"
      href={target.href}
      download={target.downloadName}
      target={isDownload ? undefined : "_blank"}
      rel={isDownload ? undefined : "noopener noreferrer"}
    >
      <span className="editor-file-block-icon" aria-hidden>
        <FileText className="h-4 w-4" />
      </span>
      <span className="editor-file-block-text">
        <span className="editor-file-block-label">{target.label}</span>
        {target.meta ? (
          <span className="editor-file-block-meta">{target.meta}</span>
        ) : null}
      </span>
      {isDownload ? (
        <Download className="h-4 w-4 shrink-0" aria-hidden />
      ) : (
        <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
      )}
    </a>
  );
}
