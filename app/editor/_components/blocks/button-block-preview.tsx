"use client";

import { runContentButtonActions } from "@/lib/editor/actions/run-action-graph";
import { getCategoryLucideIcon } from "@/lib/editor/theme/category-icons";
import type { ButtonBlock } from "@/lib/editor/types/hotspot-block";

type ButtonBlockPreviewProps = {
  block: ButtonBlock;
  hotspotId?: number;
};

export function ButtonBlockPreview({
  block,
  hotspotId,
}: ButtonBlockPreviewProps) {
  const label = block.label.trim() || "Action button";
  const description = block.description.trim();
  const Icon = getCategoryLucideIcon(block.icon);

  return (
    <button
      type="button"
      className="editor-btn editor-btn-primary editor-content-button"
      onClick={() => {
        if (hotspotId == null) return;
        void runContentButtonActions(block.ownerId, hotspotId);
      }}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="editor-content-button-text">
        <span className="editor-content-button-label">{label}</span>
        {description ? (
          <span className="editor-content-button-desc">{description}</span>
        ) : null}
      </span>
    </button>
  );
}
