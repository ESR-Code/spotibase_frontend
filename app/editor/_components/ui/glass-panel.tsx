import { cn } from "@/lib/utils";

type GlassPanelProps = React.ComponentProps<"div">;

export function GlassPanel({ className, ...props }: GlassPanelProps) {
  return (
    <div
      className={cn("editor-glass editor-panel-shadow", className)}
      {...props}
    />
  );
}
