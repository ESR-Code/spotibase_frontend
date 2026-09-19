"use client";

import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import {
  toast,
  useToastStore,
  type EditorToast,
  type ToastVariant,
} from "@/lib/editor/toast";

const TOAST_ICONS: Record<ToastVariant, typeof Info> = {
  success: CircleCheck,
  error: CircleAlert,
  info: Info,
};

function ToastCard({ item }: { item: EditorToast }) {
  const [paused, setPaused] = useState(false);
  const remainingRef = useRef(item.duration);
  const startedRef = useRef(0);

  useEffect(() => {
    if (item.leaving || item.duration <= 0) return;
    if (paused) {
      if (startedRef.current > 0) {
        remainingRef.current = Math.max(
          0,
          remainingRef.current - (Date.now() - startedRef.current),
        );
        startedRef.current = 0;
      }
      return;
    }
    startedRef.current = Date.now();
    const timer = window.setTimeout(() => {
      toast.dismiss(item.id);
    }, remainingRef.current);
    return () => window.clearTimeout(timer);
  }, [item.duration, item.id, item.leaving, paused]);

  const Icon = TOAST_ICONS[item.variant];

  return (
    <div
      className={`editor-toast editor-glass editor-panel-shadow editor-toast-${item.variant}`}
      data-leaving={item.leaving ? "true" : undefined}
      role={item.variant === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <span className="editor-toast-icon" aria-hidden>
        <Icon />
      </span>
      <div className="editor-toast-body">
        <p className="editor-toast-title">{item.title}</p>
        {item.description ? (
          <p className="editor-toast-description">{item.description}</p>
        ) : null}
      </div>
      <IconButton
        className="editor-toast-close"
        aria-label="Dismiss notification"
        onClick={() => toast.dismiss(item.id)}
      >
        <X />
      </IconButton>
    </div>
  );
}

export function EditorToaster() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="editor-toaster" aria-live="polite" aria-relevant="additions">
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </div>
  );
}
