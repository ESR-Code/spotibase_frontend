"use client";

import { cn } from "@/lib/utils";
import type { CSSProperties, ReactNode } from "react";

export type StudioLineTabItem<T extends string> = {
  id: T;
  label: string;
  icon?: ReactNode;
  /** Icon tint and underline color. */
  color?: string;
};

export function StudioLineTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  idPrefix,
  className,
}: {
  tabs: readonly StudioLineTabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  /** Links each tab to its panel via `${idPrefix}-tab-${id}` / `${idPrefix}-panel-${id}`. */
  idPrefix: string;
  className?: string;
}) {
  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const index = tabs.findIndex((tab) => tab.id === value);
    const next = tabs[(index + step + tabs.length) % tabs.length];
    onChange(next.id);
    document.getElementById(`${idPrefix}-tab-${next.id}`)?.focus();
  }

  return (
    <div role="tablist" aria-label={label} className={cn("studio-line-tabs", className)} onKeyDown={onKeyDown}>
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            id={`${idPrefix}-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            className="studio-line-tab"
            style={tab.color ? ({ "--tab-color": tab.color } as CSSProperties) : undefined}
            onClick={() => onChange(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function StudioTabPanel({
  idPrefix,
  id,
  children,
}: {
  idPrefix: string;
  id: string;
  children: ReactNode;
}) {
  return (
    <div
      role="tabpanel"
      id={`${idPrefix}-panel-${id}`}
      aria-labelledby={`${idPrefix}-tab-${id}`}
      className="studio-enter"
    >
      {children}
    </div>
  );
}
