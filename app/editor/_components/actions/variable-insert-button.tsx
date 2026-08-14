"use client";

import { Braces } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FieldSourceTreeMenu } from "@/app/editor/_components/actions/field-source-tree-menu";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import { buildFieldToken } from "@/lib/editor/actions/interpolate-fields";
import type { HttpFieldSource } from "@/lib/editor/blocks/http-field-sources";

type VariableInsertButtonProps = {
  sources: HttpFieldSource[];
  disabled?: boolean;
  /** When omitted, selecting a field copies its token to the clipboard. */
  onInsert?: (token: string) => void;
  title?: string;
  emptyTitle?: string;
};

export function VariableInsertButton({
  sources,
  disabled,
  onInsert,
  title = "Insert variable",
  emptyTitle = "Test an HTTP Request or declare Post Message fields first",
}: VariableInsertButtonProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!copiedPath) return;
    const timer = window.setTimeout(() => setCopiedPath(null), 1200);
    return () => window.clearTimeout(timer);
  }, [copiedPath]);

  const empty = sources.length === 0;

  const selectSource = async (source: HttpFieldSource) => {
    const token = buildFieldToken(source, sources);
    if (onInsert) {
      onInsert(token);
      setOpen(false);
      return;
    }
    try {
      await navigator.clipboard.writeText(token);
      setCopiedPath(source.path);
    } catch {
      setCopiedPath(null);
    }
  };

  return (
    <div ref={rootRef} className="editor-var-insert nodrag nopan nowheel">
      <IconButton
        type="button"
        title={empty ? emptyTitle : title}
        disabled={disabled || empty}
        className={open ? "is-active" : undefined}
        style={{ width: 26, height: 26 }}
        onMouseDown={(e) => e.preventDefault()}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          if (empty) return;
          setOpen((v) => !v);
        }}
      >
        <Braces className="h-3 w-3" />
      </IconButton>
      {open ? (
        <div className="editor-var-insert-menu">
          <FieldSourceTreeMenu
            sources={sources}
            copiedPath={copiedPath}
            onSelect={(source) => {
              void selectSource(source);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
