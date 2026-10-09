import { create } from "zustand";

/**
 * One reversible change. `undo` / `redo` must write straight to the owning
 * stores and must NOT record history themselves.
 */
export type HistoryEntry = {
  label: string;
  undo: () => void;
  redo: () => void;
};

type Stack = { past: HistoryEntry[]; future: HistoryEntry[] };

export const HISTORY_LIMIT = 100;

type HistoryState = {
  /** One stack per scope (e.g. an action-canvas scope key). */
  stacks: Record<string, Stack>;
  record: (scope: string, entry: HistoryEntry) => void;
  undo: (scope: string) => HistoryEntry | null;
  redo: (scope: string) => HistoryEntry | null;
  /** Undo only when `entry` is the latest change in `scope`. */
  undoEntry: (scope: string, entry: HistoryEntry) => boolean;
  /** Drop one scope, or everything when omitted. */
  clear: (scope?: string) => void;
};

export const useHistoryStore = create<HistoryState>((set, get) => ({
  stacks: {},

  record: (scope, entry) => {
    set((state) => {
      const stack = state.stacks[scope] ?? { past: [], future: [] };
      const past = [...stack.past, entry].slice(-HISTORY_LIMIT);
      return { stacks: { ...state.stacks, [scope]: { past, future: [] } } };
    });
  },

  undo: (scope) => {
    const stack = get().stacks[scope];
    const entry = stack?.past[stack.past.length - 1];
    if (!stack || !entry) return null;
    set((state) => ({
      stacks: {
        ...state.stacks,
        [scope]: {
          past: stack.past.slice(0, -1),
          future: [...stack.future, entry],
        },
      },
    }));
    entry.undo();
    return entry;
  },

  redo: (scope) => {
    const stack = get().stacks[scope];
    const entry = stack?.future[stack.future.length - 1];
    if (!stack || !entry) return null;
    set((state) => ({
      stacks: {
        ...state.stacks,
        [scope]: {
          past: [...stack.past, entry],
          future: stack.future.slice(0, -1),
        },
      },
    }));
    entry.redo();
    return entry;
  },

  undoEntry: (scope, entry) => {
    const stack = get().stacks[scope];
    if (!stack || stack.past[stack.past.length - 1] !== entry) return false;
    get().undo(scope);
    return true;
  },

  clear: (scope) => {
    if (!scope) {
      set({ stacks: {} });
      return;
    }
    set((state) => {
      if (!state.stacks[scope]) return state;
      const stacks = { ...state.stacks };
      delete stacks[scope];
      return { stacks };
    });
  },
}));

/** Imperative access for event handlers and shortcuts. */
export const history = {
  record: (scope: string, entry: HistoryEntry) =>
    useHistoryStore.getState().record(scope, entry),
  undo: (scope: string) => useHistoryStore.getState().undo(scope),
  redo: (scope: string) => useHistoryStore.getState().redo(scope),
  undoEntry: (scope: string, entry: HistoryEntry) =>
    useHistoryStore.getState().undoEntry(scope, entry),
  clear: (scope?: string) => useHistoryStore.getState().clear(scope),
};

export function useCanUndo(scope: string): boolean {
  return useHistoryStore((s) => (s.stacks[scope]?.past.length ?? 0) > 0);
}

export function useCanRedo(scope: string): boolean {
  return useHistoryStore((s) => (s.stacks[scope]?.future.length ?? 0) > 0);
}
