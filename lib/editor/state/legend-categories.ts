import { useEditorStore } from "@/lib/editor/state/editor-store";
import {
  syncActiveSceneSettings,
  useScenesStore,
} from "@/lib/editor/state/scenes-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";

type LegendCategories = ReturnType<
  typeof useSettingsStore.getState
>["legendCategories"];

/**
 * Clear Spawn Hotspot templates whose category is one of `removed`. Returns
 * the same reference when nothing changed, so callers can skip writes.
 */
function clearSpawnTemplateCategories<T>(value: T, removed: Set<string>): T {
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const mapped = clearSpawnTemplateCategories(item, removed);
      if (mapped !== item) changed = true;
      return mapped;
    });
    return (changed ? next : value) as T;
  }
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  let next: Record<string, unknown> | null = null;
  for (const [key, child] of Object.entries(record)) {
    let mapped = clearSpawnTemplateCategories(child, removed);
    if (
      key === "template" &&
      mapped &&
      typeof mapped === "object" &&
      typeof (mapped as { category?: unknown }).category === "string" &&
      removed.has((mapped as { category: string }).category)
    ) {
      mapped = { ...(mapped as object), category: "" };
    }
    if (mapped !== child) {
      next ??= { ...record };
      next[key] = mapped;
    }
  }
  return (next ?? value) as T;
}

/**
 * The one way to change the active scene's legend categories. Removing a
 * category also clears it from the scene's hotspots and Spawn Hotspot
 * templates, so nothing keeps pointing at an id the legend no longer has
 * (such hotspots fall out of every legend filter). Returns the removed ids.
 */
export function setLegendCategories(next: LegendCategories): string[] {
  const settings = useSettingsStore.getState();
  const removedIds = settings.legendCategories
    .filter((c) => !next.some((item) => item.id === c.id))
    .map((c) => c.id);
  settings.setSettings({ legendCategories: next });
  if (removedIds.length === 0) return removedIds;
  const removed = new Set(removedIds);

  const editor = useEditorStore.getState();
  for (const hotspot of editor.hotspots) {
    const actions = clearSpawnTemplateCategories(hotspot.actions, removed);
    const blocks = clearSpawnTemplateCategories(hotspot.blocks, removed);
    const category = removed.has(hotspot.category) ? "" : hotspot.category;
    if (
      actions !== hotspot.actions ||
      blocks !== hotspot.blocks ||
      category !== hotspot.category
    ) {
      editor.updateHotspot(hotspot.id, { actions, blocks, category });
    }
  }

  const scenes = useScenesStore.getState();
  const active = scenes.scenes.find((s) => s.id === scenes.activeSceneId);
  if (active?.startActions) {
    const start = clearSpawnTemplateCategories(active.startActions, removed);
    if (start !== active.startActions) scenes.setActiveSceneStartActions(start);
  }
  if (active?.legendActions) {
    const legend = clearSpawnTemplateCategories(active.legendActions, removed);
    if (legend !== active.legendActions) scenes.setActiveSceneLegendActions(legend);
  }

  const buttons = useSettingsStore.getState().customMenuButtons;
  const nextButtons = clearSpawnTemplateCategories(buttons, removed);
  if (nextButtons !== buttons) {
    useSettingsStore.getState().setSettings({ customMenuButtons: nextButtons });
  }
  syncActiveSceneSettings();
  return removedIds;
}
