"use client";

import { BLOCK_PREVIEWS } from "@/app/editor/_components/blocks/block-preview-registry";
import type { HotspotBlock } from "@/lib/editor/types/hotspot-block";

type HotspotBlocksPreviewProps = {
  blocks: HotspotBlock[];
  hotspotId?: number;
};

export function HotspotBlocksPreview({
  blocks,
  hotspotId,
}: HotspotBlocksPreviewProps) {
  if (blocks.length === 0) {
    return (
      <p
        className="text-[14px] leading-relaxed"
        style={{ color: "var(--editor-muted-2)" }}
      >
        No content yet
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block) => {
        const Preview = BLOCK_PREVIEWS[block.type];
        return (
          <Preview key={block.id} block={block} hotspotId={hotspotId} />
        );
      })}
    </div>
  );
}
