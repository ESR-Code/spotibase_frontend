import { cn } from "@/lib/utils";
import Image from "next/image";

/** Flat, muted fills with white text. The same seed always gets the same color. */
const AVATAR_COLORS = [
  "#d9475f",
  "#cf6a32",
  "#3a9a6c",
  "#2d93ad",
  "#4a69d1",
  "#7658d1",
  "#ac4c97",
  "#5d6a86",
] as const;

function colorFor(seed: string) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function initialsOf(label: string) {
  return (
    label
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  );
}

/**
 * The one avatar for people (`circle`) and organizations (`rounded`, optional logo `src`).
 * Do not hand-roll initials badges or gradients elsewhere.
 */
export function Avatar({
  name,
  src,
  size = 32,
  shape = "circle",
  initials,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  shape?: "circle" | "rounded";
  /** Defaults to the initials of `name`. */
  initials?: string;
  className?: string;
}) {
  const radius = shape === "circle" ? "rounded-full" : "rounded-[10px]";
  if (src) {
    return (
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        unoptimized
        className={cn("shrink-0 bg-[var(--studio-sub)] object-cover", radius, className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn("flex shrink-0 items-center justify-center font-extrabold text-white", radius, className)}
      style={{ width: size, height: size, fontSize: size * 0.38, backgroundColor: colorFor(name) }}
    >
      {initials ?? initialsOf(name)}
    </span>
  );
}
