import type { HeadingBlock } from "@/lib/editor/types/hotspot-block";

type HeadingBlockPreviewProps = {
  block: HeadingBlock;
};

export function HeadingBlockPreview({ block }: HeadingBlockPreviewProps) {
  if (!block.content.trim()) return null;
  return (
    <h3
      className="text-[16px] font-semibold leading-snug"
      style={{ color: "var(--editor-fg)" }}
    >
      {block.content}
    </h3>
  );
}
