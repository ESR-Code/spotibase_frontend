"use client";

import type {
  DividerBlock,
  DividerVariant,
} from "@/lib/editor/types/hotspot-block";

export const DIVIDER_VARIANT_OPTIONS: Array<{ id: DividerVariant; label: string }> = [
  { id: "line", label: "Line" },
  { id: "dashed", label: "Dashed" },
  { id: "space", label: "Space" },
];

export function DividerBlockEditor({
  block,
  onChange,
}: {
  block: DividerBlock;
  onChange: (patch: Pick<DividerBlock, "variant">) => void;
}) {
  return (
    <div className="editor-segmented" role="group" aria-label="Divider style">
      {DIVIDER_VARIANT_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={block.variant === option.id}
          onClick={() => onChange({ variant: option.id })}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
