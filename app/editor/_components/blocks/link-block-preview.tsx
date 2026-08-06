"use client";

import { ExternalLink } from "lucide-react";
import type { LinkBlock } from "@/lib/editor/types/hotspot-block";
import {
  normalizeExternalUrl,
  openExternalUrl,
} from "@/lib/editor/utils/open-external-url";

type LinkBlockPreviewProps = {
  block: LinkBlock;
};

export function LinkBlockPreview({ block }: LinkBlockPreviewProps) {
  const label = block.label.trim() || "Open Link";
  const href = normalizeExternalUrl(block.url);

  if (!href) {
    return (
      <div
        className="text-[12px]"
        style={{ color: "var(--editor-muted-2)" }}
      >
        Link button (no URL set)
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="editor-btn editor-btn-primary inline-flex items-center gap-2"
      onClick={(e) => {
        e.preventDefault();
        openExternalUrl(block.url);
      }}
    >
      <ExternalLink className="h-4 w-4" />
      {label}
    </a>
  );
}
