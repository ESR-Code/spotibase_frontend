"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

type SettingsSectionProps = {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
};

export function SettingsSection({
  title,
  icon,
  children,
  defaultOpen = false,
}: SettingsSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`editor-settings-section ${open ? "open" : ""}`}>
      <button
        type="button"
        className="editor-settings-section-head"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="editor-settings-sec-icon">{icon}</span>
        {title}
        <ChevronDown className="editor-settings-sec-chevron h-3 w-3" />
      </button>
      {open ? (
        <div className="editor-settings-section-body space-y-2.5">{children}</div>
      ) : null}
    </div>
  );
}
