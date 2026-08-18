"use client";

import { ChevronDown, Search } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FieldLabel } from "@/app/editor/_components/ui/field-label";
import {
  CATEGORY_ICONS,
  getCategoryLucideIcon,
  normalizeCategoryIcon,
} from "@/lib/editor/theme/category-icons";

type CategoryIconPickerProps = {
  value: string;
  onChange: (icon: string) => void;
  color?: string;
  /** Icon-only trigger, no field label — for compact rows. */
  compact?: boolean;
};

type MenuPosition = {
  top: number;
  left: number;
  width: number;
};

export function CategoryIconPicker({
  value,
  onChange,
  color = "#3fb8af",
  compact = false,
}: CategoryIconPickerProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const iconName = normalizeCategoryIcon(value);
  const SelectedIcon = getCategoryLucideIcon(iconName);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORY_ICONS;
    return CATEGORY_ICONS.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.label.toLowerCase().includes(q),
    );
  }, [query]);

  const updateMenuPosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const gap = 6;
    const menuHeight = Math.min(320, window.innerHeight - 24);
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const openUpward = spaceBelow < 220 && rect.top > spaceBelow;
    const top = openUpward
      ? Math.max(12, rect.top - gap - menuHeight)
      : rect.bottom + gap;

    setMenuPos({
      top,
      left: rect.left,
      width: compact ? Math.max(rect.width, 240) : rect.width,
    });
  };

  useLayoutEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const host =
    typeof document !== "undefined"
      ? document.querySelector(".editor-root") ?? document.body
      : null;

  const menu =
    open && menuPos && host
      ? createPortal(
          <div
            ref={menuRef}
            id={listId}
            className="editor-category-icon-picker-menu editor-glass editor-panel-shadow"
            role="listbox"
            style={{
              top: menuPos.top,
              left: menuPos.left,
              width: menuPos.width,
            }}
          >
            <div className="editor-category-icon-picker-search">
              <Search className="h-3.5 w-3.5 shrink-0 opacity-60" />
              <input
                className="editor-category-icon-picker-input"
                placeholder="Search icons…"
                value={query}
                autoFocus
                onChange={(e) => setQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="editor-category-icon-picker-grid">
              {filtered.length === 0 ? (
                <div className="editor-category-select-empty col-span-full">
                  No icons match
                </div>
              ) : (
                filtered.map((item) => {
                  const Icon = item.icon;
                  const selected = item.name === iconName;
                  return (
                    <button
                      key={item.name}
                      type="button"
                      role="option"
                      title={item.label}
                      aria-selected={selected}
                      className={`editor-category-icon-picker-item ${selected ? "selected" : ""}`}
                      onClick={() => {
                        onChange(item.name);
                        setOpen(false);
                        setQuery("");
                      }}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          host,
        )
      : null;

  return (
    <div
      className={`relative ${compact ? "" : "w-full space-y-1.5"}`}
      ref={rootRef}
    >
      {compact ? null : <FieldLabel>Icon</FieldLabel>}
      <button
        ref={triggerRef}
        type="button"
        className={`${compact ? "editor-custom-menu-icon-trigger" : "editor-category-select-trigger w-full"} ${open ? "open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        title={compact ? (CATEGORY_ICONS.find((i) => i.name === iconName)?.label ?? iconName) : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className="editor-category-option-icon"
          style={{ background: color }}
          aria-hidden
        >
          <SelectedIcon className="h-3 w-3" />
        </span>
        {compact ? null : (
          <>
            <span className="editor-category-option-name">
              {CATEGORY_ICONS.find((i) => i.name === iconName)?.label ?? iconName}
            </span>
            <ChevronDown className="editor-category-select-chevron h-3.5 w-3.5" />
          </>
        )}
      </button>
      {menu}
    </div>
  );
}
