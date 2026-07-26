import { cn } from "@/lib/utils";

type IconButtonProps = React.ComponentProps<"button">;

export function IconButton({ className, disabled, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "editor-icon-btn",
        disabled && "pointer-events-none opacity-40",
        className,
      )}
      {...props}
    />
  );
}
