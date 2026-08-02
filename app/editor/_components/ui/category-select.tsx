"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import { FieldLabel } from "@/app/editor/_components/ui/field-label";

export const LEGEND_CATEGORY_ALL = "__all__";

type CategorySelectProps = {
  value: string;
  categories: string[];
  onChange: (value: string) => void;
  /** When set, allows adding/removing categories from the global list. */
  onCategoriesChange?: (categories: string[]) => void;
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
  const [draft, setDraft] = useState("");
  const editable = onCategoriesChange != null;

  const addCategory = () => {
    if (!onCategoriesChange) return;
    const name = draft.trim();
    if (!name) return;
    if (categories.some((c) => c.toLowerCase() === name.toLowerCase())) {
      onChange(
        categories.find((c) => c.toLowerCase() === name.toLowerCase()) ?? name,
      );
      setDraft("");
      return;
    }
    onCategoriesChange([...categories, name]);
    onChange(name);
    setDraft("");
  };

  const removeCategory = (name: string) => {
    if (!onCategoriesChange) return;
    onCategoriesChange(categories.filter((c) => c !== name));
    if (value === name) onChange("");
  };

  return (
    <div className="space-y-2">
      <div>
        <FieldLabel>{label}</FieldLabel>
        <select
          className="editor-select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {includeAllOption ? (
            <option value={LEGEND_CATEGORY_ALL}>All</option>
          ) : null}
          {allowClear ? <option value="">None</option> : null}
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {editable ? (
        <>
          <div className="flex gap-2">
            <input
              className="editor-input min-w-0 flex-1"
              placeholder="New category name"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCategory();
                }
              }}
            />
            <EditorButton
              type="button"
              className="shrink-0 px-2.5"
              onClick={addCategory}
              disabled={!draft.trim()}
              title="Add category"
            >
              <Plus className="h-3.5 w-3.5" />
            </EditorButton>
          </div>
          {categories.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {categories.map((category) => (
                <span
                  key={category}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid var(--editor-line)",
                    color: "var(--editor-muted)",
                  }}
                >
                  {category}
                  <button
                    type="button"
                    className="rounded p-0.5 hover:opacity-80"
                    title={`Remove ${category}`}
                    style={{ color: "var(--editor-crimson-2)" }}
                    onClick={() => removeCategory(category)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
