import { create } from "zustand";

type HttpResponseState = {
  /** Preview-session responses keyed by `${ownerKey}:${nodeId}`. */
  byKey: Record<string, unknown>;
  setResponse: (key: string, data: unknown) => void;
  getResponse: (key: string) => unknown | undefined;
  hasResponse: (key: string) => boolean;
  clearResponse: (key: string) => void;
  clear: () => void;
};

export const useHttpResponseStore = create<HttpResponseState>((set, get) => ({
  byKey: {},
  setResponse: (key, data) =>
    set((state) => ({ byKey: { ...state.byKey, [key]: data } })),
  getResponse: (key) => get().byKey[key],
  hasResponse: (key) => Object.prototype.hasOwnProperty.call(get().byKey, key),
  clearResponse: (key) =>
    set((state) => {
      if (!Object.prototype.hasOwnProperty.call(state.byKey, key)) {
        return state;
      }
      const next = { ...state.byKey };
      delete next[key];
      return { byKey: next };
    }),
  clear: () => set({ byKey: {} }),
}));
