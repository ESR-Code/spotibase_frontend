import { cn } from "@/lib/utils";

type EditorChipProps = React.ComponentProps<"span">;

export function EditorChip({ className, ...props }: EditorChipProps) {
  return <span className={cn("editor-chip", className)} {...props} />;
}
