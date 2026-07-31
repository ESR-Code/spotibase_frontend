"use client";

import { getBlockDefinition } from "@/app/editor/_components/blocks/block-registry";
import type { HotspotBlock } from "@/lib/editor/types/hotspot-block";

type HotspotBlocksPreviewProps = {
  blocks: HotspotBlock[];
};

export function HotspotBlocksPreview({ blocks }: HotspotBlocksPreviewProps) {
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
        const def = getBlockDefinition(block.type);
        const Preview = def.Preview;
        return <Preview key={block.id} block={block} />;
      })}
    </div>
  );
}
