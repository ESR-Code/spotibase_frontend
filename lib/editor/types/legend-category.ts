import { DEFAULT_CATEGORY_ICON } from "@/lib/editor/theme/category-icons";

export type LegendCategory = {
  id: string;
  name: string;
  /** Lucide icon name (see category-icons). */
  icon: string;
  color: string;
};

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
