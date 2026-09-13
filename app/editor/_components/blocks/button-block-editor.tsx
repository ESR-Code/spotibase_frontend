"use client";

import { TokenField } from "@/app/editor/_components/blocks/token-field";
import { CategoryIconPicker } from "@/app/editor/_components/ui/category-icon-picker";
import type { HttpFieldSource } from "@/lib/editor/blocks/http-field-sources";
import type { ButtonBlock } from "@/lib/editor/types/hotspot-block";

type ButtonBlockEditorProps = {
  block: ButtonBlock;
  onChange: (
    patch: Partial<Pick<ButtonBlock, "icon" | "label" | "description">>,
  ) => void;
  autoFocus?: boolean;
  fieldSources?: HttpFieldSource[];
};

export function ButtonBlockEditor({
  block,
  onChange,
  autoFocus,
  fieldSources,
}: ButtonBlockEditorProps) {
  return (
    <div className="space-y-2.5">
      <div>
        <span
          className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--editor-muted-2)" }}
        >
          Icon
        </span>
        <CategoryIconPicker
          compact
          value={block.icon}
          onChange={(icon) => onChange({ icon })}
        />
      </div>
      <label className="block">
        <span
          className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--editor-muted-2)" }}
        >
          Button text
        </span>
        <TokenField
          value={block.label}
          placeholder="Action button"
          autoFocus={autoFocus}
          sources={fieldSources}
          onChange={(label) => onChange({ label })}
        />
      </label>
      <label className="block">
        <span
          className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--editor-muted-2)" }}
        >
          Description
        </span>
        <TokenField
          value={block.description}
          placeholder="Optional italic line under the label"
          sources={fieldSources}
          onChange={(description) => onChange({ description })}
        />
      </label>
      <p className="text-[11px]" style={{ color: "var(--editor-muted)" }}>
        Wire this button on the Actions canvas — it gets its own trigger lane,
        like a custom bottom-menu button.
      </p>
    </div>
  );
}
