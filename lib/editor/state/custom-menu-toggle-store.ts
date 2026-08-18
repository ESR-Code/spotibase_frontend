import { create } from "zustand";

type CustomMenuToggleState = {
  /** Button ids currently latched on in Preview. */
  toggledIds: string[];
  isToggled: (buttonId: string) => boolean;
  setToggled: (buttonId: string, on: boolean) => void;
  toggle: (buttonId: string) => boolean;
  reset: () => void;
};

/** Preview-session latch for custom menu toggle buttons. Cleared leaving Preview. */
export const useCustomMenuToggleStore = create<CustomMenuToggleState>(
  (set, get) => ({
    toggledIds: [],
    isToggled: (buttonId) => get().toggledIds.includes(buttonId),
    setToggled: (buttonId, on) =>
      set((state) => {
        const has = state.toggledIds.includes(buttonId);
        if (on === has) return state;
        return {
          toggledIds: on
            ? [...state.toggledIds, buttonId]
            : state.toggledIds.filter((id) => id !== buttonId),
        };
      }),
    toggle: (buttonId) => {
      const next = !get().toggledIds.includes(buttonId);
      get().setToggled(buttonId, next);
      return next;
    },
    reset: () => set({ toggledIds: [] }),
  }),
);
