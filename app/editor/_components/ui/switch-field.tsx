"use client";

import * as Switch from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

type SwitchFieldProps = {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
};

export function SwitchField({
  label,
  description,
  checked,
  disabled,
  onChange,
  className,
}: SwitchFieldProps) {
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
      <Switch.Root
        className="editor-switch"
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
      >
        <Switch.Thumb className="editor-switch-thumb" />
      </Switch.Root>
    </label>
  );
}
