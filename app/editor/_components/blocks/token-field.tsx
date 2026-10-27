"use client";

import { useRef } from "react";
import { VariableInsertButton } from "@/app/editor/_components/actions/variable-insert-button";
import { insertTextAt } from "@/lib/editor/actions/interpolate-fields";
import type { HttpFieldSource } from "@/lib/editor/blocks/http-field-sources";

type TokenFieldProps = {
  value: string;
  onChange: (next: string) => void;
  sources?: HttpFieldSource[];
  placeholder?: string;
  autoFocus?: boolean;
  type?: string;
  /** Textarea instead of a single-line input. */
  multiline?: boolean;
};

export function TokenField({
  value,
  onChange,
  sources = [],
  placeholder,
  autoFocus,
  type,
  multiline,
}: TokenFieldProps) {
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  return (
    <div className={`flex gap-1 ${multiline ? "items-start" : "items-center"}`}>
      {multiline ? (
        <textarea
          ref={ref}
          className="editor-textarea min-w-0 flex-1"
          style={{ minHeight: 72 }}
          value={value}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          ref={ref}
          className="editor-input min-w-0 flex-1"
          type={type}
          value={value}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {sources.length > 0 ? (
        <VariableInsertButton
          sources={sources}
          onInsert={(token) => {
            onChange(
              insertTextAt(
                value,
                token,
                ref.current?.selectionStart ?? value.length,
                ref.current?.selectionEnd ?? value.length,
              ),
            );
          }}
        />
      ) : null}
    </div>
  );
}
