import { cn } from "@/lib/utils";

type TypePillProps = React.ComponentProps<"button"> & {
  active?: boolean;
  disabled?: boolean;
};

export function TypePill({
  className,
  active,
  disabled,
  ...props
}: TypePillProps) {
  return (
    <button
      type="button"
      className={cn(
        "editor-type-pill",
        active && "active",
        disabled && "disabled",
        className,
      )}
      disabled={disabled}
      {...props}
    />
  );
}
