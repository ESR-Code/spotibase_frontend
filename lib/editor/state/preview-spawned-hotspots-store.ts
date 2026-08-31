import { create } from "zustand";
import type { Hotspot } from "@/lib/editor/types/hotspot";

/** Authored ids stay well below this; menu owners use large negatives. */
export const SPAWNED_HOTSPOT_ID_BASE = 1_000_000;

export type SpawnedEntry = {
  itemKey: string;
  hotspot: Hotspot;
};

type PreviewSpawnedState = {
  bySource: Record<string, SpawnedEntry[]>;
  /** In-progress replace pass; swapped into `bySource` on commit. */
  pending: Record<string, SpawnedEntry[]>;
  /** Stable ids for For Each items, including when they move across Switch branches. */
  idsByItemKey: Record<string, number>;
  nextId: number;
  beginPass: (sourceKey: string) => void;
  upsertPending: (
    sourceKey: string,
    itemKey: string,
    build: (id: number, previous?: Hotspot) => Hotspot,
  ) => void;
  append: (sourceKey: string, hotspot: Hotspot) => void;
  allocateId: () => number;
  commitPasses: () => void;
  list: () => Hotspot[];
  find: (id: number) => Hotspot | undefined;
  reset: () => void;
};

function hotspotsFrom(
  bySource: Record<string, SpawnedEntry[]>,
): Hotspot[] {
  return Object.values(bySource).flatMap((entries) =>
    entries.map((entry) => entry.hotspot),
  );
}

function findEntryByItemKey(
  buckets: Record<string, SpawnedEntry[]>,
  itemKey: string,
  skipSource?: string,
): SpawnedEntry | undefined {
  for (const [sourceKey, entries] of Object.entries(buckets)) {
    if (sourceKey === skipSource) continue;
    const found = entries.find((entry) => entry.itemKey === itemKey);
    if (found) return found;
  }
  return undefined;
}

export const usePreviewSpawnedHotspotsStore = create<PreviewSpawnedState>(
  (set, get) => ({
    bySource: {},
    pending: {},
    idsByItemKey: {},
    nextId: SPAWNED_HOTSPOT_ID_BASE,
    beginPass: (sourceKey) => {
      set((state) => ({
        pending: { ...state.pending, [sourceKey]: [] },
      }));
    },
    upsertPending: (sourceKey, itemKey, build) => {
      const state = get();
      const pendingList = state.pending[sourceKey];
      if (!pendingList) return;

      const existingPending = pendingList.find(
        (entry) => entry.itemKey === itemKey,
      );
      const previousSame = (state.bySource[sourceKey] ?? []).find(
        (entry) => entry.itemKey === itemKey,
      );
      const previousOther =
        findEntryByItemKey(state.pending, itemKey, sourceKey) ??
        findEntryByItemKey(state.bySource, itemKey, sourceKey);
      const previous =
        existingPending ?? previousSame ?? previousOther;
      const id =
        previous?.hotspot.id ??
        state.idsByItemKey[itemKey] ??
        get().allocateId();
      const hotspot = build(id, previous?.hotspot);
      const nextEntry: SpawnedEntry = { itemKey, hotspot };

      set((latest) => {
        const list = latest.pending[sourceKey];
        if (!list) return latest;
        const index = list.findIndex((entry) => entry.itemKey === itemKey);
        const nextList =
          index >= 0
            ? list.map((entry, i) => (i === index ? nextEntry : entry))
            : [...list, nextEntry];
        return {
          pending: { ...latest.pending, [sourceKey]: nextList },
          idsByItemKey: { ...latest.idsByItemKey, [itemKey]: id },
        };
      });
    },
    append: (sourceKey, hotspot) =>
      set((state) => ({
        bySource: {
          ...state.bySource,
          [sourceKey]: [
            ...(state.bySource[sourceKey] ?? []),
            { itemKey: `new:${hotspot.id}`, hotspot },
          ],
        },
      })),
    allocateId: () => {
      const id = get().nextId;
      set({ nextId: id + 1 });
      return id;
    },
    commitPasses: () => {
      const { pending } = get();
      const keys = Object.keys(pending);
      if (keys.length === 0) return;
      set((state) => {
        const bySource = { ...state.bySource };
        for (const key of keys) {
          const next = state.pending[key] ?? [];
          if (next.length === 0) delete bySource[key];
          else bySource[key] = next;
        }
        return { bySource, pending: {} };
      });
    },
    list: () => hotspotsFrom(get().bySource),
    find: (id) => get().list().find((hotspot) => hotspot.id === id),
    reset: () =>
      set({
        bySource: {},
        pending: {},
        idsByItemKey: {},
        nextId: SPAWNED_HOTSPOT_ID_BASE,
      }),
  }),
);
