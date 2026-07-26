import { cn } from "@/lib/utils";

type FieldLabelProps = React.ComponentProps<"label">;

export function FieldLabel({ className, ...props }: FieldLabelProps) {
  return <label className={cn("editor-field-label", className)} {...props} />;
}
