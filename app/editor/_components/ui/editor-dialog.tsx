"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
} from "react";
import { cn } from "@/lib/utils";
import type {
  MarkerDialogPresentation,
  MarkerDialogSize,
} from "@/lib/editor/types/editor-settings";

export type EditorDialogPresentation = Exclude<MarkerDialogPresentation, "off">;

type EditorDialogContextValue = {
  titleId: string;
  onClose: () => void;
  presentation: EditorDialogPresentation;
};

const EditorDialogContext = createContext<EditorDialogContextValue | null>(
  null,
);

function useEditorDialogContext() {
  const ctx = useContext(EditorDialogContext);
  if (!ctx) {
    throw new Error("EditorDialog compound parts must be used within EditorDialog");
  }
  return ctx;
}

export type EditorDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Visual presentation. `"off"` renders nothing. */
  presentation?: MarkerDialogPresentation;
  /** Dimmed overlay behind the surface. */
  backdrop?: boolean;
  /** Blur content behind the backdrop (requires backdrop). */
  backdropBlur?: boolean;
  /** Close when clicking the backdrop. Defaults to true when backdrop is on. */
  closeOnBackdrop?: boolean;
  /** Close on Escape. Default true. */
  closeOnEscape?: boolean;
  /** Drawer side. Default `"right"`. */
  side?: "left" | "right";
  /** Desktop size. Mobile always renders fullscreen. Default `"medium"`. */
  size?: MarkerDialogSize;
  className?: string;
  children: React.ReactNode;
};

export function EditorDialog({
  open,
  onClose,
  presentation = "drawer",
  backdrop = false,
  backdropBlur = false,
  closeOnBackdrop,
  closeOnEscape = true,
  side = "right",
  size = "medium",
  className,
  children,
}: EditorDialogProps) {
  const titleId = useId();
  const showBackdrop = backdrop && presentation !== "off";
  const allowBackdropClose = closeOnBackdrop ?? showBackdrop;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape" && closeOnEscape) onClose();
    },
    [closeOnEscape, onClose],
  );

  useEffect(() => {
    if (!open || presentation === "off") return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, presentation, handleKeyDown]);

  const ctx = useMemo(
    () => ({
      titleId,
      onClose,
      presentation: (presentation === "off" ? "drawer" : presentation) as EditorDialogPresentation,
    }),
    [titleId, onClose, presentation],
  );

  if (!open || presentation === "off") return null;

  const surfaceClass =
    presentation === "modal"
      ? "editor-dialog-modal"
      : cn(
          "editor-dialog-drawer",
          side === "left" && "editor-dialog-drawer-left",
        );

  const sizeClass = `editor-dialog-size-${size}`;

  return (
    <EditorDialogContext.Provider value={ctx}>
      <div
        className={cn(
          "editor-dialog-root",
          presentation === "modal" && "editor-dialog-root-modal",
          presentation === "drawer" && "editor-dialog-root-drawer",
          sizeClass,
          open && "open",
        )}
        role="presentation"
      >
        {showBackdrop ? (
          <button
            type="button"
            aria-label="Close dialog"
            className={cn(
              "editor-dialog-backdrop",
              backdropBlur && "editor-dialog-backdrop-blur",
            )}
            onClick={() => {
              if (allowBackdropClose) onClose();
            }}
          />
        ) : null}

        <div
          role="dialog"
          aria-modal={showBackdrop || presentation === "modal"}
          aria-labelledby={titleId}
          className={cn(
            "editor-dialog-surface editor-glass editor-panel-shadow",
            surfaceClass,
            sizeClass,
            className,
          )}
        >
          {children}
        </div>
      </div>
    </EditorDialogContext.Provider>
  );
}

function DialogHeader({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const { titleId } = useEditorDialogContext();

  return (
    <div className={cn("editor-dialog-header", className)}>
      {(title || description) && (
        <div className="min-w-0 flex-1">
          {title ? (
            <div id={titleId} className="font-display text-[15px] font-bold">
              {title}
            </div>
          ) : (
            <span id={titleId} className="sr-only">
              Dialog
            </span>
          )}
          {description ? (
            <div className="text-[11px]" style={{ color: "var(--editor-muted)" }}>
              {description}
            </div>
          ) : null}
        </div>
      )}
      {children}
    </div>
  );
}

function DialogBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("editor-dialog-body", className)}>{children}</div>;
}

function DialogFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("editor-dialog-footer", className)}>{children}</div>;
}

function DialogMedia({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("editor-dialog-media", className)}>{children}</div>;
}

EditorDialog.Header = DialogHeader;
EditorDialog.Body = DialogBody;
EditorDialog.Footer = DialogFooter;
EditorDialog.Media = DialogMedia;
