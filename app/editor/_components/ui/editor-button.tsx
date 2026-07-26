import { cn } from "@/lib/utils";

type EditorButtonProps = React.ComponentProps<"button"> & {
  variant?: "default" | "primary" | "ghost";
};

export function EditorButton({
  className,
  variant = "default",
  ...props
}: EditorButtonProps) {
  return (
    <button
      className={cn(
        "editor-btn",
        variant === "primary" && "editor-btn-primary",
        variant === "ghost" && "editor-btn-ghost",
        className,
      )}
      {...props}
    />
  );
}
