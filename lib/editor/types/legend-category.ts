import { DEFAULT_CATEGORY_ICON } from "@/lib/editor/theme/category-icons";

/** Sentinel value for “show every hotspot” in the Legend filter. */
export const LEGEND_CATEGORY_ALL = "__all__";

export type LegendCategory = {
  id: string;
  name: string;
  /** Lucide icon name (see category-icons). */
  icon: string;
  color: string;
};

/**
 * Legend filter to start Preview / a scene with: the scene's initial category
 * when the legend is enabled and the category still exists, otherwise “all”.
 */
export function resolveInitialLegendCategory(settings: {
  legendEnabled: boolean;
  legendInitialCategory?: string;
  legendCategories: LegendCategory[];
}): string {
  const id = settings.legendInitialCategory;
  if (!settings.legendEnabled || !id) return LEGEND_CATEGORY_ALL;
  return settings.legendCategories.some((category) => category.id === id)
    ? id
    : LEGEND_CATEGORY_ALL;
}

export function createLegendCategoryId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `cat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createLegendCategory(
  partial: Partial<Omit<LegendCategory, "id">> & { name: string },
): LegendCategory {
  return {
    id: createLegendCategoryId(),
    name: partial.name.trim(),
    icon: partial.icon ?? DEFAULT_CATEGORY_ICON,
    color: partial.color ?? "#3fb8af",
  };
}
