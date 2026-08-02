"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CategoryIconPicker } from "@/app/editor/_components/ui/category-icon-picker";
import { ColorSwatch } from "@/app/editor/_components/ui/color-swatch";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import { FieldLabel } from "@/app/editor/_components/ui/field-label";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import { DEFAULT_CATEGORY_ICON, normalizeCategoryIcon } from "@/lib/editor/theme/category-icons";
import { markerColorSwatches } from "@/lib/editor/theme/tokens";
import {
  createLegendCategory,
  type LegendCategory,
} from "@/lib/editor/types/legend-category";

type CategoryDialogProps = {
  open: boolean;
  /** When set, dialog edits this category; otherwise creates a new one. */
  category?: LegendCategory | null;
  existingNames: string[];
  onClose: () => void;
  onSave: (category: LegendCategory) => void;
};

export function CategoryDialog({
  open,
  category,
  existingNames,
  onClose,
  onSave,
}: CategoryDialogProps) {
  const isEdit = category != null;
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(DEFAULT_CATEGORY_ICON);
  const [color, setColor] = useState("#3fb8af");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? "");
    setIcon(normalizeCategoryIcon(category?.icon ?? DEFAULT_CATEGORY_ICON));
    setColor(category?.color ?? "#3fb8af");
    setError("");
  }, [open, category]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required");
      return;
    }
    const duplicate = existingNames.some(
      (n) =>
        n.toLowerCase() === trimmed.toLowerCase() &&
        n.toLowerCase() !== (category?.name ?? "").toLowerCase(),
    );
    if (duplicate) {
      setError("A category with this name already exists");
      return;
    }

    if (isEdit && category) {
      onSave({ ...category, name: trimmed, icon, color });
    } else {
      onSave(createLegendCategory({ name: trimmed, icon, color }));
    }
    onClose();
  };

  const host =
    typeof document !== "undefined"
      ? document.querySelector(".editor-root") ?? document.body
      : null;

  if (!host) return null;

  return createPortal(
    <div className="editor-category-dialog-root" role="presentation">
      <button
        type="button"
        className="editor-category-dialog-backdrop"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? "Edit category" : "Add category"}
        className="editor-category-dialog editor-glass editor-panel-shadow"
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid var(--editor-line-soft)" }}
        >
          <div>
            <div className="font-display text-[14px] font-bold">
              {isEdit ? "Edit category" : "Add category"}
            </div>
            <div className="text-[11px]" style={{ color: "var(--editor-muted)" }}>
              Name, icon, and color for the legend
            </div>
          </div>
          <IconButton title="Close" onClick={onClose}>
            <X />
          </IconButton>
        </div>

        <div className="space-y-3 p-4">
          <div>
            <FieldLabel>Name</FieldLabel>
            <input
              className="editor-input"
              autoFocus
              placeholder="e.g. Safety"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
            />
            {error ? (
              <p
                className="mt-1.5 text-[11px]"
                style={{ color: "var(--editor-crimson-2)" }}
              >
                {error}
              </p>
            ) : null}
          </div>

          <CategoryIconPicker value={icon} color={color} onChange={setIcon} />

          <div>
            <FieldLabel>Color</FieldLabel>
            <div className="editor-swatch-row">
              {markerColorSwatches.map((swatch) => (
                <ColorSwatch
                  key={swatch}
                  color={swatch}
                  selected={color === swatch}
                  onClick={() => setColor(swatch)}
                />
              ))}
            </div>
          </div>
        </div>

        <div
          className="flex gap-2 p-4"
          style={{ borderTop: "1px solid var(--editor-line-soft)" }}
        >
          <EditorButton className="flex-1" onClick={onClose}>
            Cancel
          </EditorButton>
          <EditorButton variant="primary" className="flex-1" onClick={submit}>
            {isEdit ? "Save" : "Add"}
          </EditorButton>
        </div>
      </div>
    </div>,
    host,
  );
}
