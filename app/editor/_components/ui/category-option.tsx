"use client";

import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getCategoryLucideIcon,
  normalizeCategoryIcon,
} from "@/lib/editor/theme/category-icons";
import type { LegendCategory } from "@/lib/editor/types/legend-category";

type CategoryOptionProps = {
  category: LegendCategory;
  selected?: boolean;
  showActions?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
  compact?: boolean;
};

export function CategoryOption({
  category,
  selected,
  showActions = false,
  onSelect,
  onEdit,
  onDelete,
  className,
  compact = false,
}: CategoryOptionProps) {
  const Icon = getCategoryLucideIcon(normalizeCategoryIcon(category.icon));

  return (
    <div
      className={cn(
        "editor-category-option",
        selected && "selected",
        compact && "compact",
        className,
      )}
      role={onSelect ? "option" : undefined}
      aria-selected={onSelect ? selected : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
    >
      <span
        className="editor-category-option-icon"
        style={{ background: category.color }}
        aria-hidden
      >
        <Icon className="h-3 w-3" />
      </span>
      <span className="editor-category-option-name">{category.name}</span>
      {showActions ? (
        <span className="editor-category-option-actions">
          <button
            type="button"
            className="editor-category-option-action"
            title={`Edit ${category.name}`}
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.();
            }}
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            type="button"
            className="editor-category-option-action danger"
            title={`Delete ${category.name}`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </span>
      ) : null}
    </div>
  );
}

export function CategoryOptionBadge({
  category,
  className,
}: {
  category: LegendCategory;
  className?: string;
}) {
  const Icon = getCategoryLucideIcon(normalizeCategoryIcon(category.icon));

  return (
    <span className={cn("editor-category-badge", className)}>
      <span
        className="editor-category-badge-icon"
        style={{ background: category.color }}
        aria-hidden
      >
        <Icon className="h-2.5 w-2.5" />
      </span>
      <span className="truncate">{category.name}</span>
    </span>
  );
}
