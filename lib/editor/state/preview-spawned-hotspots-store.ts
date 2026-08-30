import { create } from "zustand";
import type { Hotspot } from "@/lib/editor/types/hotspot";

/** Authored ids stay well below this; menu owners use large negatives. */
export const SPAWNED_HOTSPOT_ID_BASE = 1_000_000;

type PreviewSpawnedState = {
  bySource: Record<string, Hotspot[]>;
  nextId: number;
  beginBatch: (sourceKey: string, replace: boolean) => void;
  append: (sourceKey: string, hotspot: Hotspot) => void;
  allocateId: () => number;
  list: () => Hotspot[];
  find: (id: number) => Hotspot | undefined;
  reset: () => void;
};

export const usePreviewSpawnedHotspotsStore = create<PreviewSpawnedState>(
  (set, get) => ({
    bySource: {},
    nextId: SPAWNED_HOTSPOT_ID_BASE,
    beginBatch: (sourceKey, replace) => {
      if (!replace) return;
      set((state) => {
        if (!(sourceKey in state.bySource)) return state;
        const bySource = { ...state.bySource };
        delete bySource[sourceKey];
        return { bySource };
      });
    },
    append: (sourceKey, hotspot) =>
      set((state) => ({
        bySource: {
          ...state.bySource,
          [sourceKey]: [...(state.bySource[sourceKey] ?? []), hotspot],
        },
      })),
    allocateId: () => {
      const id = get().nextId;
      set({ nextId: id + 1 });
      return id;
    },
    list: () => Object.values(get().bySource).flat(),
    find: (id) => get().list().find((hotspot) => hotspot.id === id),
    reset: () => set({ bySource: {}, nextId: SPAWNED_HOTSPOT_ID_BASE }),
  }),
);
