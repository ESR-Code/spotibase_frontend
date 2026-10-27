"use client";

import { useLayoutEffect, useRef } from "react";
import {
  CalloutFrame,
} from "@/app/editor/_components/blocks/callout-block-preview";
import { VariableInsertButton } from "@/app/editor/_components/actions/variable-insert-button";
import { CategoryIconPicker } from "@/app/editor/_components/ui/category-icon-picker";
import { ColorSwatch } from "@/app/editor/_components/ui/color-swatch";
import { insertTextAt } from "@/lib/editor/actions/interpolate-fields";
import {
  CALLOUT_TONES,
  calloutTone,
  resolveCalloutIcon,
} from "@/lib/editor/blocks/callout";
import type { HttpFieldSource } from "@/lib/editor/blocks/http-field-sources";
import type { CalloutBlock } from "@/lib/editor/types/hotspot-block";

type CalloutField = "title" | "content";

/**
 * The callout is edited in place: the box below is what Preview shows. Click
 * the icon to change it, type the title and text directly, pick a color under it.
 */
export function CalloutBlockEditor({
  block,
  onChange,
  autoFocus,
  fieldSources = [],
}: {
  block: CalloutBlock;
  onChange: (
    patch: Partial<Pick<CalloutBlock, "tone" | "icon" | "title" | "content">>,
  ) => void;
  autoFocus?: boolean;
  fieldSources?: HttpFieldSource[];
}) {
  const titleRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const lastField = useRef<CalloutField>("content");
  const tone = calloutTone(block.tone);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [block.content]);

  const insertToken = (token: string) => {
    const field = lastField.current;
    const el = field === "title" ? titleRef.current : textRef.current;
    const value = field === "title" ? block.title : block.content;
    const next = insertTextAt(
      value,
      token,
      el?.selectionStart ?? value.length,
      el?.selectionEnd ?? value.length,
    );
    onChange(field === "title" ? { title: next } : { content: next });
  };

  return (
    <div className="space-y-2">
      <CalloutFrame
        tone={block.tone}
        badge={
          <CategoryIconPicker
            compact
            color={tone.color}
            value={resolveCalloutIcon(block)}
            onChange={(icon) => onChange({ icon })}
          />
        }
      >
        <input
          ref={titleRef}
          className="editor-callout-block-input editor-callout-block-title"
          value={block.title}
          placeholder="Title (optional)"
          autoFocus={autoFocus}
          aria-label="Callout title"
          onFocus={() => (lastField.current = "title")}
          onChange={(e) => onChange({ title: e.target.value })}
        />
        <textarea
          ref={textRef}
          className="editor-callout-block-input editor-callout-block-text"
          rows={1}
          value={block.content}
          placeholder="Write a message…"
          aria-label="Callout text"
          onFocus={() => (lastField.current = "content")}
          onChange={(e) => onChange({ content: e.target.value })}
        />
      </CalloutFrame>

      <div className="flex items-center gap-1.5">
        <div className="editor-swatch-row-compact flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Callout color">
          {CALLOUT_TONES.map((item) => (
            <ColorSwatch
              key={item.id}
              color={item.color}
              selected={block.tone === item.id}
              role="radio"
              aria-checked={block.tone === item.id}
              aria-label={item.label}
              title={item.label}
              onClick={() => onChange({ tone: item.id })}
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
