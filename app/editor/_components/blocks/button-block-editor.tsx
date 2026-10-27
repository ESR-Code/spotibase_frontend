"use client";

import { useRef } from "react";
import { VariableInsertButton } from "@/app/editor/_components/actions/variable-insert-button";
import { ButtonFrame } from "@/app/editor/_components/blocks/button-block-preview";
import { CategoryIconPicker } from "@/app/editor/_components/ui/category-icon-picker";
import { ColorSwatch } from "@/app/editor/_components/ui/color-swatch";
import { insertTextAt } from "@/lib/editor/actions/interpolate-fields";
import {
  BUTTON_BLOCK_COLORS,
  resolveButtonBlockColor,
} from "@/lib/editor/blocks/button-colors";
import type { HttpFieldSource } from "@/lib/editor/blocks/http-field-sources";
import type { ButtonBlock } from "@/lib/editor/types/hotspot-block";

type ButtonBlockEditorProps = {
  block: ButtonBlock;
  onChange: (
    patch: Partial<Pick<ButtonBlock, "icon" | "label" | "description" | "color">>,
  ) => void;
  autoFocus?: boolean;
  fieldSources?: HttpFieldSource[];
};

type ButtonField = "label" | "description";

/**
 * The button is edited in place: the box below is what Preview shows. Click the
 * icon to change it, type the label and description on the button, pick a color
 * under it. What it does is wired in the hotspot's Actions tab.
 */
export function ButtonBlockEditor({
  block,
  onChange,
  autoFocus,
  fieldSources = [],
}: ButtonBlockEditorProps) {
  const color = resolveButtonBlockColor(block.color);
  const labelRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLInputElement>(null);
  const lastField = useRef<ButtonField>("label");

  const insertToken = (token: string) => {
    const field = lastField.current;
    const el = field === "label" ? labelRef.current : descRef.current;
    const value = block[field];
    const next = insertTextAt(
      value,
      token,
      el?.selectionStart ?? value.length,
      el?.selectionEnd ?? value.length,
    );
    onChange({ [field]: next });
  };

  return (
    <div className="space-y-1.5">
      <ButtonFrame
        color={color}
        icon={
          <CategoryIconPicker
            bare
            value={block.icon}
            onChange={(icon) => onChange({ icon })}
          />
        }
      >
        <span
          className="editor-content-button-field editor-content-button-label"
        >
          <input
            ref={labelRef}
            className="editor-content-button-input"
            value={block.label}
            placeholder="Button text"
            autoFocus={autoFocus}
            aria-label="Button text"
            onFocus={() => (lastField.current = "label")}
            onChange={(e) => onChange({ label: e.target.value })}
          />
        </span>
        <span
          className="editor-content-button-field editor-content-button-desc"
        >
          <input
            ref={descRef}
            className="editor-content-button-input"
            value={block.description}
            placeholder="Description (optional)"
            aria-label="Button description"
            onFocus={() => (lastField.current = "description")}
            onChange={(e) => onChange({ description: e.target.value })}
          />
        </span>
      </ButtonFrame>

      <div className="flex items-center gap-1.5">
        <div
          className="editor-swatch-row-compact flex flex-wrap items-center gap-1.5"
          role="radiogroup"
          aria-label="Button color"
        >
          {BUTTON_BLOCK_COLORS.map((item) => (
            <ColorSwatch
              key={item.id}
              color={item.swatch}
              selected={color === item.id}
              role="radio"
              aria-checked={color === item.id}
              aria-label={item.label}
              title={item.label}
              onClick={() => onChange({ color: item.id })}
            />
          ))}
        </div>
        {fieldSources.length > 0 ? (
          <div className="ml-auto">
            <VariableInsertButton sources={fieldSources} onInsert={insertToken} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
