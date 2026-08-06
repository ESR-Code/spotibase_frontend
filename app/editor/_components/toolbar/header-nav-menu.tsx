"use client";

import { useEffect, useRef, useState } from "react";
import { Layers, Menu, Settings2 } from "lucide-react";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useUIStore } from "@/lib/editor/state/ui-store";

export function HeaderNavMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const isPreview = useEditorStore((s) => s.isPreview);
  const scenesModalOpen = useUIStore((s) => s.scenesModalOpen);
  const setScenesModalOpen = useUIStore((s) => s.setScenesModalOpen);
  const generalSettingsOpen = useUIStore((s) => s.generalSettingsDrawerOpen);
  const setGeneralSettingsDrawerOpen = useUIStore(
    (s) => s.setGeneralSettingsDrawerOpen,
  );
  const setSettingsDrawerOpen = useUIStore((s) => s.setSettingsDrawerOpen);

  const active = scenesModalOpen || generalSettingsOpen;

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

  return (
    <div ref={rootRef} className="relative">
      <div
        className="flex items-center rounded-xl p-1"
        style={{
          background: "rgba(11,20,36,0.6)",
          border: "1px solid var(--editor-line)",
        }}
      >
        <button
          type="button"
          title="Project menu"
          aria-label="Project menu"
          aria-expanded={open}
          aria-haspopup="menu"
          className={`editor-tool-btn ${open || active ? "active" : ""}`}
          onClick={() => setOpen((v) => !v)}
        >
          <Menu className="h-3.5 w-3.5" />
        </button>
      </div>

      {open ? (
        <div
          role="menu"
          className="editor-header-nav-menu absolute left-0 top-full z-40 mt-2 min-w-[188px] overflow-hidden rounded-lg py-1"
        >
          <button
            type="button"
            role="menuitem"
            disabled={isPreview}
            className={`editor-header-nav-menu-item ${scenesModalOpen ? "active" : ""} ${isPreview ? "disabled" : ""}`}
            onClick={() => {
              if (isPreview) return;
              setGeneralSettingsDrawerOpen(false);
              setScenesModalOpen(true);
              setOpen(false);
            }}
          >
            <Layers className="h-3.5 w-3.5" />
            Scenes
          </button>
          <button
            type="button"
            role="menuitem"
            className={`editor-header-nav-menu-item ${generalSettingsOpen ? "active" : ""}`}
            onClick={() => {
              setSettingsDrawerOpen(false);
              setScenesModalOpen(false);
              setGeneralSettingsDrawerOpen(!generalSettingsOpen);
              setOpen(false);
            }}
          >
            <Settings2 className="h-3.5 w-3.5" />
            General settings
          </button>
        </div>
      ) : null}
    </div>
  );
}
