"use client";

import { ArrowDown, ArrowUp, CopyPlus, Ellipsis, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import {
  getEditorPortalHost,
  useFixedMenuPosition,
} from "@/app/editor/_components/ui/fixed-portal-menu";

type BlockCardMenuProps = {
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
};

/** "⋯" menu on a block card: keyboard / touch reordering and Duplicate. */
export function BlockCardMenu({
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onDuplicate,
}: BlockCardMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuPos = useFixedMenuPosition(open, triggerRef, menuRef, {
    align: "right",
  });
  const host = getEditorPortalHost();

  useEffect(() => {
    if (!open) return;
    menuRef.current
      ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
      ?.focus();
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.querySelector("button")?.focus();
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const items: Array<{
    label: string;
    Icon: LucideIcon;
    disabled?: boolean;
    run: () => void;
  }> = [
    { label: "Move up", Icon: ArrowUp, disabled: !canMoveUp, run: onMoveUp },
    { label: "Move down", Icon: ArrowDown, disabled: !canMoveDown, run: onMoveDown },
    { label: "Duplicate", Icon: CopyPlus, run: onDuplicate },
  ];

  return (
    <div ref={triggerRef}>
      <IconButton
        title="More block options"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{ width: 28, height: 28 }}
      >
        <Ellipsis className="h-3.5 w-3.5" />
      </IconButton>

      {open && host
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              className="editor-add-block-menu editor-block-card-menu"
              onKeyDown={(e) => {
                if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
                e.preventDefault();
                const buttons = [
                  ...(menuRef.current?.querySelectorAll<HTMLButtonElement>(
                    "button:not(:disabled)",
                  ) ?? []),
                ];
                const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
                const step = e.key === "ArrowDown" ? 1 : -1;
                buttons[(at + step + buttons.length) % buttons.length]?.focus();
              }}
              style={
                menuPos
                  ? { top: menuPos.top, left: menuPos.left }
                  : { top: -9999, left: -9999 }
              }
            >
              {items.map(({ label, Icon, disabled, run }) => (
                <button
                  key={label}
                  type="button"
                  role="menuitem"
                  disabled={disabled}
                  onClick={() => {
                    run();
                    setOpen(false);
                  }}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>,
            host,
          )
        : null}
    </div>
  );
}
