import { create } from "zustand";
import type { Hotspot, HotspotStyle } from "@/lib/editor/types/hotspot";

export type HotspotAppearanceOverride = {
  color?: string;
  icon?: string;
  style?: HotspotStyle;
};

type PreviewAppearanceState = {
  overrides: Record<number, HotspotAppearanceOverride>;
  setColor: (hotspotIds: number[], color: string | null) => void;
  setIcon: (hotspotIds: number[], icon: string | null) => void;
  reset: () => void;
};

function withoutKeys(
  override: HotspotAppearanceOverride,
  keys: (keyof HotspotAppearanceOverride)[],
): HotspotAppearanceOverride | null {
  const next: HotspotAppearanceOverride = { ...override };
  for (const key of keys) {
    delete next[key];
  }
  return Object.keys(next).length > 0 ? next : null;
}

/** Preview-session color/icon overlays. Cleared when leaving Preview. */
export const usePreviewAppearanceStore = create<PreviewAppearanceState>(
  (set) => ({
    overrides: {},
    setColor: (hotspotIds, color) =>
      set((state) => {
        const overrides = { ...state.overrides };
        for (const id of hotspotIds) {
          const prev = overrides[id] ?? {};
          if (!color) {
            const next = withoutKeys(prev, ["color"]);
            if (next) overrides[id] = next;
            else delete overrides[id];
          } else {
            overrides[id] = { ...prev, color };
          }
        }
        return { overrides };
      }),
    setIcon: (hotspotIds, icon) =>
      set((state) => {
        const overrides = { ...state.overrides };
        for (const id of hotspotIds) {
          const prev = overrides[id] ?? {};
          if (!icon) {
            const next = withoutKeys(prev, ["icon", "style"]);
            if (next) overrides[id] = next;
            else delete overrides[id];
          } else {
            overrides[id] = { ...prev, icon, style: "icon" };
          }
        }
        return { overrides };
      }),
    reset: () => set({ overrides: {} }),
  }),
);

/** Merge authored hotspot with Preview appearance overrides. */
export function resolveHotspotAppearance(
  hotspot: Hotspot,
  isPreview: boolean,
): Hotspot {
  if (!isPreview) return hotspot;
  const override = usePreviewAppearanceStore.getState().overrides[hotspot.id];
  if (!override) return hotspot;
  return { ...hotspot, ...override };
}
