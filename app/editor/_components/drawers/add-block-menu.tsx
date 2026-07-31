"use client";

import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BLOCK_MENU_ITEMS } from "@/app/editor/_components/blocks/block-registry";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import type { HotspotBlockType } from "@/lib/editor/types/hotspot-block";

type AddBlockMenuProps = {
  onAdd: (type: HotspotBlockType) => void;
};

export function AddBlockMenu({ onAdd }: AddBlockMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
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

      {open ? (
        <div
          role="menu"
          className="absolute bottom-full z-20 mb-2 min-w-[160px] overflow-hidden rounded-lg py-1"
          style={{
            border: "1px solid var(--editor-line)",
            background: "rgba(17, 30, 54, 0.98)",
            boxShadow: "0 12px 32px -12px rgba(0,0,0,0.65)",
            backdropFilter: "blur(12px)",
          }}
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
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
                onClick={() => {
                  onAdd(item.type);
                  setOpen(false);
                }}
              >
                <Icon className="h-3.5 w-3.5" style={{ color: "var(--editor-muted)" }} />
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
