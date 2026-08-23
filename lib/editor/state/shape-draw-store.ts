import { create } from "zustand";

type ShapeDrawState = {
  drawing: boolean;
  points: [number, number][];
  cursor: [number, number] | null;
  begin: () => void;
  addPoint: (lng: number, lat: number) => void;
  setCursor: (lng: number, lat: number) => void;
  cancel: () => void;
};

export const useShapeDrawStore = create<ShapeDrawState>((set) => ({
  drawing: false,
  points: [],
  cursor: null,
  begin: () => set({ drawing: true, points: [], cursor: null }),
  addPoint: (lng, lat) =>
    set((state) => ({
      points: [...state.points, [lng, lat]],
    })),
  setCursor: (lng, lat) => set({ cursor: [lng, lat] }),
  cancel: () => set({ drawing: false, points: [], cursor: null }),
}));
