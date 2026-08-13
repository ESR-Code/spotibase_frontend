"use client";

import { Bold, Braces, Italic, Underline } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import { buildHttpFieldChipHtml } from "@/lib/editor/blocks/http-field-chip";
import { listHttpFieldSources } from "@/lib/editor/blocks/http-field-sources";
import {
  normalizeRichTextContent,
  sanitizeRichTextHtml,
} from "@/lib/editor/blocks/rich-text";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import type { TextBlock } from "@/lib/editor/types/hotspot-block";

type TextBlockEditorProps = {
  block: TextBlock;
  onChange: (content: string) => void;
  autoFocus?: boolean;
  hotspotId?: number;
};

type FormatCommand = "bold" | "italic" | "underline";

export function TextBlockEditor({
  block,
  onChange,
  autoFocus,
  hotspotId,
}: TextBlockEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const focusedRef = useRef(false);
  const savedRangeRef = useRef<Range | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState({
    bold: false,
    italic: false,
    underline: false,
  });

  const hotspot = useEditorStore((s) =>
    hotspotId != null ? s.hotspots.find((h) => h.id === hotspotId) ?? null : null,
  );
  const appStartActions = useScenesStore((s) => s.appStartActions);
  const sceneStartActions = useScenesStore((s) => {
    const scene =
      s.scenes.find((sc) => sc.id === s.activeSceneId) ?? s.scenes[0];
    return scene?.startActions ?? null;
  });

  const fieldSources = useMemo(
    () => (hotspot ? listHttpFieldSources(hotspot) : []),
    [appStartActions, hotspot, sceneStartActions],
  );

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

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

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

  const saveSelection = () => {
    const el = editorRef.current;
    const selection = window.getSelection();
    if (!el || !selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) return;
    savedRangeRef.current = range.cloneRange();
  };

  const restoreSelection = () => {
    const el = editorRef.current;
    const selection = window.getSelection();
    if (!el || !selection) return;

    el.focus();
    selection.removeAllRanges();

    if (savedRangeRef.current && el.contains(savedRangeRef.current.startContainer)) {
      selection.addRange(savedRangeRef.current);
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    selection.addRange(range);
  };

  const applyFormat = (command: FormatCommand) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    document.execCommand(command, false);
    emitChange();
  };

  const insertField = (nodeId: string, path: string) => {
    const el = editorRef.current;
    const selection = window.getSelection();
    if (!el || !selection) return;

    restoreSelection();

    const range =
      selection.rangeCount > 0 ? selection.getRangeAt(0) : document.createRange();
    if (selection.rangeCount === 0) {
      range.selectNodeContents(el);
      range.collapse(false);
      selection.addRange(range);
    }

    range.deleteContents();

    const template = document.createElement("template");
    // Insert chip + trailing space in one fragment so browsers don't wrap
    // the chip in a new block/row.
    template.innerHTML = `${buildHttpFieldChipHtml(nodeId, path)} `;
    const fragment = template.content;
    const lastNode = fragment.lastChild;
    range.insertNode(fragment);

    if (lastNode) {
      const next = document.createRange();
      next.setStartAfter(lastNode);
      next.collapse(true);
      selection.removeAllRanges();
      selection.addRange(next);
      savedRangeRef.current = next.cloneRange();
    }

    emitChange();
    setMenuOpen(false);
  };

  return (
    <div className="editor-rich-text">
      <div
        className="editor-rich-text-toolbar"
        role="toolbar"
        aria-label="Text formatting"
      >
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

        <div className="editor-vsep" style={{ height: 16, margin: "0 2px" }} />

        <div ref={menuRef} className="relative">
          <IconButton
            type="button"
            title={
              fieldSources.length > 0
                ? "Insert API / message field"
                : "Add HTTP test data or Post Message fields to insert"
            }
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            disabled={fieldSources.length === 0}
            className={menuOpen ? "is-active" : undefined}
            style={{ width: 28, height: 28 }}
            onMouseDown={(e) => {
              e.preventDefault();
              saveSelection();
            }}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Braces className="h-3.5 w-3.5" />
          </IconButton>

          {menuOpen ? (
            <div
              role="menu"
              className="editor-http-field-menu absolute left-0 top-full z-30 mt-1 max-h-56 min-w-[220px] overflow-y-auto rounded-lg py-1"
            >
              {fieldSources.map((source) => (
                <button
                  key={`${source.nodeId}:${source.path}`}
                  type="button"
                  role="menuitem"
                  className="editor-http-field-menu-item"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertField(source.nodeId, source.path)}
                >
                  <span className="block truncate text-[12px] font-medium">
                    {source.path}
                  </span>
                  <span
                    className="block truncate text-[10px]"
                    style={{ color: "var(--editor-muted)" }}
                  >
                    {source.sample} · {source.nodeLabel}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {fieldSources.length === 0 ? (
        <div className="text-[10px]" style={{ color: "var(--editor-muted-2)" }}>
          Tip: Test an HTTP Request, or declare Post Message receive fields,
          to insert values here.
        </div>
      ) : null}

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
          saveSelection();
          emitChange();
        }}
        onInput={emitChange}
        onKeyUp={() => {
          saveSelection();
          syncActiveFormats();
        }}
        onMouseUp={() => {
          saveSelection();
          syncActiveFormats();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            document.execCommand("insertParagraph", false);
            emitChange();
          }
        }}
      />
    </div>
  );
}
