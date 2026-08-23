import { create } from "zustand";
import {
  cloneLayer,
  cloneLayers,
  nextLayerId,
  type ImageOverlayGeoPose,
  type ImageOverlayLayer,
  type SceneLayer,
  type ShapeOverlayLayer,
} from "@/lib/editor/types/scene-layer";

type AddLayerInput =
  | (Omit<ImageOverlayLayer, "id"> & { id?: string })
  | (Omit<ShapeOverlayLayer, "id"> & { id?: string });

type UpdateLayerPatch = Partial<
  Omit<ImageOverlayLayer, "id" | "kind"> & Omit<ShapeOverlayLayer, "id" | "kind">
>;

type LayersState = {
  layers: SceneLayer[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  addLayer: (layer: AddLayerInput) => SceneLayer;
  updateLayer: (id: string, patch: UpdateLayerPatch) => void;
  updateGeoPose: (
    id: string,
    patch: Partial<Omit<ImageOverlayGeoPose, "space">>,
  ) => void;
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
    const layer = cloneLayer({ ...input, id } as SceneLayer);
    set((state) => ({
      layers: [...state.layers, layer],
      selectedId: id,
    }));
    return layer;
  },

  updateLayer: (id, patch) => {
    set((state) => ({
      layers: state.layers.map((layer) => {
        if (layer.id !== id) return layer;
        if (layer.kind === "image-overlay") {
          return cloneLayer({
            ...layer,
            name: patch.name ?? layer.name,
            visible: patch.visible ?? layer.visible,
            locked: patch.locked ?? layer.locked,
            opacity: patch.opacity ?? layer.opacity,
            blend: patch.blend ?? layer.blend,
            imageDataUrl: patch.imageDataUrl ?? layer.imageDataUrl,
            naturalWidth: patch.naturalWidth ?? layer.naturalWidth,
            naturalHeight: patch.naturalHeight ?? layer.naturalHeight,
            pose:
              patch.pose && "space" in patch.pose
                ? patch.pose
                : layer.pose,
            id: layer.id,
            kind: "image-overlay",
          });
        }
        return cloneLayer({
          ...layer,
          name: patch.name ?? layer.name,
          visible: patch.visible ?? layer.visible,
          locked: patch.locked ?? layer.locked,
          opacity: patch.opacity ?? layer.opacity,
          shape: patch.shape ?? layer.shape,
          fillColor: patch.fillColor ?? layer.fillColor,
          strokeColor: patch.strokeColor ?? layer.strokeColor,
          strokeWidth: patch.strokeWidth ?? layer.strokeWidth,
          pose:
            patch.pose && patch.pose.space === "geo"
              ? patch.pose
              : layer.pose,
          id: layer.id,
          kind: "shape-overlay",
        });
      }),
    }));
  },

  updateGeoPose: (id, patch) => {
    set((state) => ({
      layers: state.layers.map((layer) => {
        if (layer.id !== id) return layer;
        if (layer.kind === "image-overlay") {
          if (layer.pose.space !== "geo") return layer;
          return cloneLayer({
            ...layer,
            pose: { ...layer.pose, ...patch },
          });
        }
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
      const kind = state.layers[index]!.kind;
      let target = -1;
      if (direction === "forward") {
        for (let i = index + 1; i < state.layers.length; i++) {
          if (state.layers[i]!.kind === kind) {
            target = i;
            break;
          }
        }
      } else {
        for (let i = index - 1; i >= 0; i--) {
          if (state.layers[i]!.kind === kind) {
            target = i;
            break;
          }
        }
      }
      if (target < 0) return state;
      const layers = [...state.layers];
      const current = layers[index]!;
      layers[index] = layers[target]!;
      layers[target] = current;
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
