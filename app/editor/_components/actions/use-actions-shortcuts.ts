"use client";

import { useEffect, useRef } from "react";
import { isEditableKeyboardTarget } from "@/lib/editor/hooks/use-editor-keyboard";

export type ActionsShortcutHandlers = {
  undo: () => void;
  redo: () => void;
  /** Return false when there was nothing to act on (the key keeps its default). */
  copy: () => boolean;
  paste: () => boolean;
  duplicate: () => boolean;
};

/** Mounted canvases, oldest first. Only the newest (top-most modal) reacts. */
const mounted: symbol[] = [];

export const IS_MAC =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

/** Label for a Ctrl/⌘ shortcut: `shortcutLabel("Z")` → "Ctrl+Z" / "⌘Z". */
export function shortcutLabel(key: string, shift = false): string {
  if (IS_MAC) return `${shift ? "⇧" : ""}⌘${key}`;
  return `Ctrl+${shift ? "Shift+" : ""}${key}`;
}

/**
 * Action canvas shortcuts: Ctrl/⌘ + Z undo, Shift+Z / Y redo, C copy,
 * V paste, D duplicate. Ignored while typing in a field.
 */
export function useActionsShortcuts(handlers: ActionsShortcutHandlers) {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const id = Symbol("actions-canvas");
    mounted.push(id);

    const onKeyDown = (event: KeyboardEvent) => {
      if (mounted[mounted.length - 1] !== id) return;
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      if (isEditableKeyboardTarget(event.target)) return;

      const key = event.key.toLowerCase();
      const handlers = handlersRef.current;
      let handled = false;

      if (key === "z") {
        if (event.shiftKey) handlers.redo();
        else handlers.undo();
        handled = true;
      } else if (key === "y") {
        handlers.redo();
        handled = true;
      } else if (key === "c") {
        // Leave copy alone when the user has text selected.
        if (window.getSelection()?.toString()) return;
        handled = handlers.copy();
      } else if (key === "v") {
        handled = handlers.paste();
      } else if (key === "d") {
        // Always claim Ctrl+D so the browser doesn't bookmark the page.
        handlers.duplicate();
        handled = true;
      }

      if (handled) event.preventDefault();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      const index = mounted.indexOf(id);
      if (index >= 0) mounted.splice(index, 1);
    };
  }, []);
}
