"use client";

import { ChevronDown, Layers, Plus } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { CategoryDialog } from "@/app/editor/_components/ui/category-dialog";
import { CategoryOption } from "@/app/editor/_components/ui/category-option";
import { FieldLabel } from "@/app/editor/_components/ui/field-label";
import type { LegendCategory } from "@/lib/editor/types/legend-category";

export const LEGEND_CATEGORY_ALL = "__all__";

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
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LegendCategory | null>(null);
  const manageable = onCategoriesChange != null;

  const selected = categories.find((c) => c.id === value) ?? null;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
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

  return (
    <div className="relative space-y-1.5" ref={rootRef}>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <div className="editor-category-select-row">
        <button
          type="button"
          className={`editor-category-select-trigger ${open ? "open" : ""}`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((v) => !v)}
        >
          {selected && value !== LEGEND_CATEGORY_ALL ? (
            <CategoryOption category={selected} compact className="pointer-events-none" />
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

      {open ? (
        <div
          id={listId}
          className="editor-category-select-menu editor-glass editor-panel-shadow"
          role="listbox"
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
              {manageable ? "No categories yet — click + to add one" : "No categories"}
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
        </div>
      ) : null}

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
