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
};

export function TokenField({
  value,
  onChange,
  sources = [],
  placeholder,
  autoFocus,
  type,
}: TokenFieldProps) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-1">
      <input
        ref={ref}
        className="editor-input min-w-0 flex-1"
        type={type}
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
      />
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
