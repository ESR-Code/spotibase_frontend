import {
  cloneActionGraph,
  createEmptyActionGraph,
} from "@/lib/editor/actions/create-action-graph";
import { DEFAULT_CATEGORY_ICON } from "@/lib/editor/theme/category-icons";
import type { CustomMenuButton } from "@/lib/editor/types/editor-settings";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";

/** Synthetic owner ids for custom bottom-menu buttons (never overlaps App/Scene Start). */
export const MENU_BUTTON_OWNER_BASE = -10000;

export function isMenuButtonOwnerId(ownerId: number): boolean {
  return ownerId <= MENU_BUTTON_OWNER_BASE;
}

function createCustomMenuButtonId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `menu_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function collectKnownOwnerIds(): number[] {
  const ids: number[] = [];
  for (const button of useSettingsStore.getState().customMenuButtons ?? []) {
    ids.push(button.ownerId);
  }
  for (const scene of useScenesStore.getState().scenes) {
    for (const button of scene.settings.customMenuButtons ?? []) {
      ids.push(button.ownerId);
    }
  }
  return ids;
}

export function nextMenuButtonOwnerId(): number {
  const known = collectKnownOwnerIds().filter((id) => isMenuButtonOwnerId(id));
  if (known.length === 0) return MENU_BUTTON_OWNER_BASE;
  return Math.min(...known) - 1;
}

export function createCustomMenuButton(
  partial: Partial<Pick<CustomMenuButton, "icon" | "tooltip">> & {
    tooltip?: string;
  } = {},
): CustomMenuButton {
  const existing = useSettingsStore.getState().customMenuButtons ?? [];
  const index = existing.length + 1;
  return {
    id: createCustomMenuButtonId(),
    ownerId: nextMenuButtonOwnerId(),
    icon: partial.icon ?? DEFAULT_CATEGORY_ICON,
    tooltip: (partial.tooltip ?? `Button ${index}`).trim() || `Button ${index}`,
    toggleEnabled: false,
    toggledIcon: partial.icon ?? DEFAULT_CATEGORY_ICON,
    actions: createEmptyActionGraph(),
  };
}

export function findCustomMenuButtonByOwnerId(
  ownerId: number,
): CustomMenuButton | null {
  const live = useSettingsStore
    .getState()
    .customMenuButtons.find((button) => button.ownerId === ownerId);
  if (live) return live;

  for (const scene of useScenesStore.getState().scenes) {
    const match = (scene.settings.customMenuButtons ?? []).find(
      (button) => button.ownerId === ownerId,
    );
    if (match) return match;
  }
  return null;
}

export function listCustomMenuButtonGraphs(): Array<{
  ownerId: number;
  label: string;
  graph: ReturnType<typeof cloneActionGraph>;
}> {
  const scenes = useScenesStore.getState();
  const live = useSettingsStore.getState().customMenuButtons ?? [];
  const seen = new Set<number>();
  const result: Array<{
    ownerId: number;
    label: string;
    graph: ReturnType<typeof cloneActionGraph>;
  }> = [];

  for (const button of live) {
    seen.add(button.ownerId);
    result.push({
      ownerId: button.ownerId,
      label: button.tooltip.trim() || "Custom button",
      graph: cloneActionGraph(button.actions),
    });
  }

  for (const scene of scenes.scenes) {
    if (scene.id === scenes.activeSceneId) continue;
    for (const button of scene.settings.customMenuButtons ?? []) {
      if (seen.has(button.ownerId)) continue;
      seen.add(button.ownerId);
      result.push({
        ownerId: button.ownerId,
        label: button.tooltip.trim() || "Custom button",
        graph: cloneActionGraph(button.actions),
      });
    }
  }

  return result;
}
