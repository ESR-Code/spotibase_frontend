import { create } from "zustand";
import {
  cloneLayer,
  cloneLayers,
  nextLayerId,
  type ImageOverlayGeoPose,
  type ImageOverlayLayer,
  type SceneLayer,
} from "@/lib/editor/types/scene-layer";

type LayersState = {
  layers: SceneLayer[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  addLayer: (layer: Omit<ImageOverlayLayer, "id"> & { id?: string }) => ImageOverlayLayer;
  updateLayer: (id: string, patch: Partial<Omit<ImageOverlayLayer, "id" | "kind">>) => void;
  updateGeoPose: (id: string, patch: Partial<Omit<ImageOverlayGeoPose, "space">>) => void;
  removeLayer: (id: string) => void;
  moveLayer: (id: string, direction: "forward" | "backward") => void;
  hydrateLayers: (layers: SceneLayer[]) => void;
  resetLayers: () => void;
};

export const useLayersStore = create<LayersState>((set, get) => ({
  layers: [],
  selectedId: null,

  setSelectedId: (selectedId) => set({ selectedId }),

  addLayer: (input) => {
    const id = input.id ?? nextLayerId(get().layers);
    const layer: ImageOverlayLayer = {
      ...input,
      id,
      kind: "image-overlay",
      blend: input.blend ?? 0,
    };
    set((state) => ({
      layers: [...state.layers, cloneLayer(layer)],
      selectedId: id,
    }));
    return layer;
  },

  updateLayer: (id, patch) => {
    set((state) => ({
      layers: state.layers.map((layer) => {
        if (layer.id !== id || layer.kind !== "image-overlay") return layer;
        const next: ImageOverlayLayer = {
          ...layer,
          ...patch,
          id: layer.id,
          kind: "image-overlay",
          pose: patch.pose ?? layer.pose,
        };
        return cloneLayer(next);
      }),
    }));
  },

  updateGeoPose: (id, patch) => {
    set((state) => ({
      layers: state.layers.map((layer) => {
        if (layer.id !== id || layer.kind !== "image-overlay") return layer;
        if (layer.pose.space !== "geo") return layer;
        return cloneLayer({
          ...layer,
          pose: { ...layer.pose, ...patch },
        });
      }),
    }));
  },

  removeLayer: (id) => {
    set((state) => ({
      layers: state.layers.filter((layer) => layer.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    }));
  },

  moveLayer: (id, direction) => {
    set((state) => {
      const index = state.layers.findIndex((layer) => layer.id === id);
      if (index < 0) return state;
      const swap = direction === "forward" ? index + 1 : index - 1;
      if (swap < 0 || swap >= state.layers.length) return state;
      const layers = [...state.layers];
      const current = layers[index]!;
      layers[index] = layers[swap]!;
      layers[swap] = current;
      return { layers };
    });
  },

  hydrateLayers: (layers) =>
    set({
      layers: cloneLayers(layers),
      selectedId: null,
    }),

  resetLayers: () => set({ layers: [], selectedId: null }),
}));

export function readLayersSnapshot(): SceneLayer[] {
  return cloneLayers(useLayersStore.getState().layers);
}
