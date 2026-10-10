import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type EditorButtonProps = React.ComponentProps<"button"> & {
  variant?: "default" | "primary" | "ghost" | "danger" | "outline";
};

export const EditorButton = forwardRef<HTMLButtonElement, EditorButtonProps>(
  function EditorButton({ className, variant = "default", ...props }, ref) {
    return (
      <button
        ref={ref}
        className={cn(
          "editor-btn",
          variant === "primary" && "editor-btn-primary",
          variant === "ghost" && "editor-btn-ghost",
          variant === "danger" && "editor-btn-danger",
          variant === "outline" && "editor-btn-outline",
          className,
        )}
        {...props}
      />
    );
  },
);
