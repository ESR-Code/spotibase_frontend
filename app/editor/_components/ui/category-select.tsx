"use client";

import { ChevronDown, Layers, Plus } from "lucide-react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { CategoryDialog } from "@/app/editor/_components/ui/category-dialog";
import { CategoryOption } from "@/app/editor/_components/ui/category-option";
import { FieldLabel } from "@/app/editor/_components/ui/field-label";
import {
  LEGEND_CATEGORY_ALL,
  type LegendCategory,
} from "@/lib/editor/types/legend-category";

export { LEGEND_CATEGORY_ALL };

type CategorySelectProps = {
  value: string;
  categories: LegendCategory[];
  onChange: (value: string) => void;
  /** When set, enables add / edit / delete via the compact selector UI. */
  onCategoriesChange?: (categories: LegendCategory[]) => void;
  includeAllOption?: boolean;
  allowClear?: boolean;
  label?: string;
};

type MenuPosition = {
  top: number;
  left: number;
  width: number;
};

export function CategorySelect({
  value,
  categories,
  onChange,
  onCategoriesChange,
  includeAllOption = false,
  allowClear = false,
  label = "Category",
}: CategorySelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LegendCategory | null>(null);
  const manageable = onCategoriesChange != null;

  const selected = categories.find((c) => c.id === value) ?? null;

  const updateMenuPosition = () => {
    const trigger = triggerRef.current;
    const root = rootRef.current;
    if (!trigger || !root) return;
    const row = root.querySelector(
      ".editor-category-select-row",
    ) as HTMLElement | null;
    const rect = (row ?? trigger).getBoundingClientRect();
    const gap = 4;
    const menuHeight = Math.min(240, window.innerHeight - 24);
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const openUpward = spaceBelow < 160 && rect.top > spaceBelow;
    const top = openUpward
      ? Math.max(12, rect.top - gap - menuHeight)
      : rect.bottom + gap;

    setMenuPos({
      top,
      left: rect.left,
      width: rect.width,
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

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
    setOpen(false);
  };

  const openEdit = (category: LegendCategory) => {
    setEditing(category);
    setDialogOpen(true);
    setOpen(false);
  };

  const handleDelete = (category: LegendCategory) => {
    if (!onCategoriesChange) return;
    onCategoriesChange(categories.filter((c) => c.id !== category.id));
    if (value === category.id) onChange("");
  };

  const handleSave = (category: LegendCategory) => {
    if (!onCategoriesChange) return;
    const exists = categories.some((c) => c.id === category.id);
    if (exists) {
      onCategoriesChange(
        categories.map((c) => (c.id === category.id ? category : c)),
      );
    } else {
      onCategoriesChange([...categories, category]);
      onChange(category.id);
    }
  };

  const triggerLabel = (() => {
    if (includeAllOption && value === LEGEND_CATEGORY_ALL) return "All";
    if (allowClear && value === "") return "None";
    return selected?.name ?? "Select category";
  })();

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
            className="editor-category-select-menu editor-glass editor-panel-shadow"
            role="listbox"
            style={{
              top: menuPos.top,
              left: menuPos.left,
              width: menuPos.width,
            }}
          >
            {includeAllOption ? (
              <button
                type="button"
                role="option"
                aria-selected={value === LEGEND_CATEGORY_ALL}
                className={`editor-category-select-special ${value === LEGEND_CATEGORY_ALL ? "selected" : ""}`}
                onClick={() => {
                  onChange(LEGEND_CATEGORY_ALL);
                  setOpen(false);
                }}
              >
                <Layers className="h-3.5 w-3.5 opacity-70" />
                All
              </button>
            ) : null}

            {allowClear ? (
              <button
                type="button"
                role="option"
                aria-selected={value === ""}
                className={`editor-category-select-special ${value === "" ? "selected" : ""}`}
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                None
              </button>
            ) : null}

            {categories.length === 0 ? (
              <div className="editor-category-select-empty">
                {manageable
                  ? "No categories yet — click + to add one"
                  : "No categories"}
              </div>
            ) : (
              categories.map((category) => (
                <CategoryOption
                  key={category.id}
                  category={category}
                  selected={value === category.id}
                  showActions={manageable}
                  onSelect={() => {
                    onChange(category.id);
                    setOpen(false);
                  }}
                  onEdit={() => openEdit(category)}
                  onDelete={() => handleDelete(category)}
                />
              ))
            )}
          </div>,
          host,
        )
      : null;

  return (
    <div className="relative space-y-1.5" ref={rootRef}>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <div className="editor-category-select-row">
        <button
          ref={triggerRef}
          type="button"
          className={`editor-category-select-trigger ${open ? "open" : ""}`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((v) => !v)}
        >
          {selected && value !== LEGEND_CATEGORY_ALL ? (
            <CategoryOption
              category={selected}
              compact
              className="pointer-events-none"
            />
          ) : (
            <span className="editor-category-select-placeholder">
              {includeAllOption && value === LEGEND_CATEGORY_ALL ? (
                <Layers className="h-3.5 w-3.5 shrink-0 opacity-70" />
              ) : null}
              {triggerLabel}
            </span>
          )}
          <ChevronDown className="editor-category-select-chevron h-3.5 w-3.5" />
        </button>

        {manageable ? (
          <button
            type="button"
            className="editor-category-select-add"
            title="Add category"
            onClick={openCreate}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {menu}

      {manageable ? (
        <CategoryDialog
          open={dialogOpen}
          category={editing}
          existingNames={categories.map((c) => c.name)}
          onClose={() => {
            setDialogOpen(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      ) : null}
    </div>
  );
}
