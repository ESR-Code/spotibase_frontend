"use client";

import {
  getCategoryLucideIcon,
  normalizeCategoryIcon,
} from "@/lib/editor/theme/category-icons";

type HotspotMarkerIconProps = {
  icon: string;
  className?: string;
};

/** Renders a hotspot marker icon (Lucide name or legacy emoji). */
export function HotspotMarkerIcon({
  icon,
  className = "h-3 w-3",
}: HotspotMarkerIconProps) {
  const Icon = getCategoryLucideIcon(normalizeCategoryIcon(icon));
  return <Icon className={className} strokeWidth={2.5} aria-hidden />;
}
