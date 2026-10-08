"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import {
  confirmSettle,
  useConfirmStore,
} from "@/lib/editor/confirm";

export function ConfirmDialogHost() {
  const current = useConfirmStore((state) => state.current);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    return () => useConfirmStore.getState().dismissAll();
  }, []);

  useEffect(() => {
    if (!current) return;
    const frame = requestAnimationFrame(() => confirmRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        confirmSettle(false);
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [current]);

  if (!current || typeof document === "undefined") return null;

  const host = document.querySelector(".editor-root") ?? document.body;

  return createPortal(
    <div className="editor-confirm-dialog-root" role="presentation">
      <button
        type="button"
        className="editor-confirm-dialog-backdrop"
        aria-label={current.cancelLabel}
        onClick={() => confirmSettle(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-confirm-title"
        aria-describedby="editor-confirm-description"
        className="editor-confirm-dialog"
      >
        <div className="editor-confirm-dialog-body">
          <div className="editor-confirm-dialog-icon" aria-hidden>
            <Trash2 />
          </div>
          <div id="editor-confirm-title" className="editor-confirm-dialog-title">
            {current.title}
          </div>
          <p id="editor-confirm-description" className="editor-confirm-dialog-copy">
            {current.description}
          </p>
        </div>
        <div className="editor-confirm-dialog-actions">
          <EditorButton className="flex-1" onClick={() => confirmSettle(false)}>
            {current.cancelLabel}
          </EditorButton>
          <EditorButton
            ref={confirmRef}
            variant="danger"
            className="flex-1"
            onClick={() => confirmSettle(true)}
          >
            <Trash2 className="h-4 w-4" />
            {current.confirmLabel}
          </EditorButton>
        </div>
      </div>
    </div>,
    host,
  );
}
