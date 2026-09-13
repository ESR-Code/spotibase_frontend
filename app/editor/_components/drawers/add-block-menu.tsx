"use client";

import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BLOCK_MENU_ITEMS } from "@/app/editor/_components/blocks/block-registry";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import {
  getEditorPortalHost,
  useFixedMenuPosition,
} from "@/app/editor/_components/ui/fixed-portal-menu";
import type { HotspotBlockType } from "@/lib/editor/types/hotspot-block";

type AddBlockMenuProps = {
  onAdd: (type: HotspotBlockType) => void;
};

export function AddBlockMenu({ onAdd }: AddBlockMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuPos = useFixedMenuPosition(open, rootRef, menuRef, {
    align: "center",
    gap: 8,
  });
  const host = getEditorPortalHost();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
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

  return (
    <div ref={rootRef} className="relative flex justify-center pt-1">
      <IconButton
        title="Add block"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 36,
          height: 36,
          borderRadius: 999,
          border: "1px dashed var(--editor-line)",
          background: open ? "rgba(230,57,70,0.12)" : "rgba(11,20,36,0.5)",
        }}
      >
        <Plus className="h-4 w-4" />
      </IconButton>

      {open && host
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              className="editor-add-block-menu"
              style={
                menuPos
                  ? { top: menuPos.top, left: menuPos.left }
                  : { top: -9999, left: -9999 }
              }
            >
              {BLOCK_MENU_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.type}
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium transition-colors"
                    style={{ color: "var(--editor-fg)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.06)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                    onClick={() => {
                      onAdd(item.type);
                      setOpen(false);
                    }}
                  >
                    <Icon
                      className="h-3.5 w-3.5"
                      style={{ color: "var(--editor-muted)" }}
                    />
                    {item.label}
                  </button>
                );
              })}
            </div>,
            host,
          )
        : null}
    </div>
  );
}
