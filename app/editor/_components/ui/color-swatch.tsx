import { cn } from "@/lib/utils";

type ColorSwatchProps = React.ComponentProps<"button"> & {
  color: string;
  selected?: boolean;
};

export function ColorSwatch({
  className,
  color,
  selected,
  ...props
}: ColorSwatchProps) {
  return (
    <button
      type="button"
      className={cn("editor-swatch", selected && "selected", className)}
      style={{ background: color }}
      aria-label={`Color ${color}`}
      {...props}
    />
  );
}
