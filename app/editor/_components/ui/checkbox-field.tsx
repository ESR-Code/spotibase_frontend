"use client";

import { cn } from "@/lib/utils";

type CheckboxFieldProps = {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
};

export function CheckboxField({
  label,
  description,
  checked,
  disabled,
  onChange,
  className,
}: CheckboxFieldProps) {
  return (
    <label
      className={cn(
        "editor-checkbox-field",
        disabled && "disabled",
        className,
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] font-semibold">{label}</span>
        {description ? (
          <span
            className="mt-0.5 block text-[11px] leading-snug"
            style={{ color: "var(--editor-muted)" }}
          >
            {description}
          </span>
        ) : null}
      </span>
      <input
        type="checkbox"
        className="editor-checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
