"use client";

import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

export type HotspotTargetOption = {
  id: number;
  label: string;
  chip: string;
};

function toggleId(selected: number[], id: number, checked: boolean): number[] {
  if (checked) {
    return selected.includes(id) ? selected : [...selected, id];
  }
  return selected.filter((item) => item !== id);
}

type HotspotTargetsPanelProps = {
  options: HotspotTargetOption[];
  selectedIds: number[];
  onChange: (hotspotIds: number[]) => void;
  /** Extra controls rendered below the targets panel (color/icon pickers). */
  children?: ReactNode;
};

export function HotspotTargetsPanel({
  options,
  selectedIds,
  onChange,
  children,
}: HotspotTargetsPanelProps) {
  const [targetsOpen, setTargetsOpen] = useState(false);
  const ids = options.map((option) => option.id);
  const allSelected =
    ids.length > 0 && ids.every((id) => selectedIds.includes(id));
  const selectedCount = selectedIds.filter((id) =>
    options.some((option) => option.id === id),
  ).length;

  return (
    <div className="space-y-2">
      <div className="editor-enable-disable-panel nodrag nopan nowheel">
        <button
          type="button"
          className="editor-enable-disable-toggle"
          aria-expanded={targetsOpen}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setTargetsOpen((open) => !open);
          }}
        >
          <span>Hotspots</span>
          <span
            className="flex items-center gap-1.5"
            style={{ color: "var(--editor-muted)" }}
          >
            <span className="text-[10px] font-medium">
              {selectedCount}/{options.length} selected
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${targetsOpen ? "rotate-180" : ""}`}
            />
          </span>
        </button>

        {targetsOpen ? (
          <div className="editor-enable-disable-targets">
            <div className="editor-enable-disable-group">
              <div className="editor-enable-disable-group-header">
                <div className="editor-enable-disable-group-label">Targets</div>
                <button
                  type="button"
                  className="editor-enable-disable-group-all"
                  disabled={options.length === 0}
                  title={allSelected ? "Deselect all" : "Select all"}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(allSelected ? [] : [...ids]);
                  }}
                >
                  {allSelected ? "None" : "All"}
                </button>
              </div>
              {options.length === 0 ? (
                <div
                  className="px-2 py-1.5 text-[10px]"
                  style={{ color: "var(--editor-muted)" }}
                >
                  No hotspots in this scene
                </div>
              ) : (
                options.map((option) => {
                  const checked = selectedIds.includes(option.id);
                  return (
                    <label
                      key={option.id}
                      className="editor-enable-disable-option"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className="editor-checkbox"
                        checked={checked}
                        onChange={(e) => {
                          e.stopPropagation();
                          onChange(
                            toggleId(selectedIds, option.id, e.target.checked),
                          );
                        }}
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {option.label}
                      </span>
                      <span
                        className="shrink-0 text-[9px] font-semibold"
                        style={{ color: "var(--editor-muted-2)" }}
                      >
                        {option.chip}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}
