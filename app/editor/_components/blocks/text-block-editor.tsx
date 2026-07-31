"use client";

import { Bold, Italic, Underline } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import {
  normalizeRichTextContent,
  sanitizeRichTextHtml,
} from "@/lib/editor/blocks/rich-text";
import type { TextBlock } from "@/lib/editor/types/hotspot-block";

type TextBlockEditorProps = {
  block: TextBlock;
  onChange: (content: string) => void;
  autoFocus?: boolean;
};

type FormatCommand = "bold" | "italic" | "underline";

export function TextBlockEditor({
  block,
  onChange,
  autoFocus,
}: TextBlockEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const focusedRef = useRef(false);
  const [active, setActive] = useState({
    bold: false,
    italic: false,
    underline: false,
  });

  useEffect(() => {
    const el = editorRef.current;
    if (!el || focusedRef.current) return;
    const next = normalizeRichTextContent(block.content);
    if (el.innerHTML !== next) {
      el.innerHTML = next || "";
    }
  }, [block.id, block.content]);

  useEffect(() => {
    if (!autoFocus) return;
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }, [autoFocus]);

  const syncActiveFormats = () => {
    setActive({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
    });
  };

  const emitChange = () => {
    const el = editorRef.current;
    if (!el) return;
    onChange(sanitizeRichTextHtml(el.innerHTML));
    syncActiveFormats();
  };

  const applyFormat = (command: FormatCommand) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    document.execCommand(command, false);
    emitChange();
  };

  return (
    <div className="editor-rich-text">
      <div className="editor-rich-text-toolbar" role="toolbar" aria-label="Text formatting">
        <IconButton
          type="button"
          title="Bold"
          aria-pressed={active.bold}
          className={active.bold ? "is-active" : undefined}
          style={{ width: 28, height: 28 }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyFormat("bold")}
        >
          <Bold className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton
          type="button"
          title="Italic"
          aria-pressed={active.italic}
          className={active.italic ? "is-active" : undefined}
          style={{ width: 28, height: 28 }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyFormat("italic")}
        >
          <Italic className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton
          type="button"
          title="Underline"
          aria-pressed={active.underline}
          className={active.underline ? "is-active" : undefined}
          style={{ width: 28, height: 28 }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyFormat("underline")}
        >
          <Underline className="h-3.5 w-3.5" />
        </IconButton>
      </div>
      <div
        ref={editorRef}
        className="editor-rich-text-input"
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Write something…"
        role="textbox"
        aria-multiline="true"
        onFocus={() => {
          focusedRef.current = true;
          syncActiveFormats();
        }}
        onBlur={() => {
          focusedRef.current = false;
          emitChange();
        }}
        onInput={emitChange}
        onKeyUp={syncActiveFormats}
        onMouseUp={syncActiveFormats}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            // Prefer paragraph breaks so spacing between paragraphs is preserved.
            e.preventDefault();
            document.execCommand("insertParagraph", false);
            emitChange();
          }
        }}
      />
    </div>
  );
}
