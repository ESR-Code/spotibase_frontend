import { create } from "zustand";
import { DEMO_HOTSPOTS } from "@/lib/editor/constants/demo-hotspots";
import { hotspotTypeColors } from "@/lib/editor/theme/tokens";
import type { EditorMode, Hotspot, Vec3 } from "@/lib/editor/types/hotspot";
import { PROJECT_NAME } from "@/lib/editor/theme/tokens";

type EditorState = {
  projectName: string;
  mode: EditorMode;
  isPreview: boolean;
  hotspots: Hotspot[];
  selectedId: number | null;
  hoveredId: number | null;
  nextId: number;
  draggingId: number | null;
  previewDown: { x: number; y: number; id: number | null } | null;
  previewDragged: boolean;
  setMode: (mode: EditorMode | "preview") => void;
  addHotspot: (position: Vec3, data?: Partial<Omit<Hotspot, "id" | "position">>) => Hotspot;
  updateHotspot: (id: number, patch: Partial<Hotspot>) => void;
  removeHotspot: (id: number) => void;
  selectHotspot: (id: number | null) => void;
  setHoveredHotspot: (id: number | null) => void;
  setDraggingId: (id: number | null) => void;
  setPreviewDown: (value: EditorState["previewDown"]) => void;
  setPreviewDragged: (value: boolean) => void;
  duplicateHotspot: (id: number) => void;
  initDemoHotspots: () => void;
};

function createHotspotData(
  id: number,
  position: Vec3,
  data: Partial<Omit<Hotspot, "id" | "position">> = {},
): Hotspot {
  const type = data.type ?? "info";
  const title = data.title ?? `Hotspot ${String(id).padStart(3, "0")}`;
  return {
    id,
    title,
    desc:
      data.desc ??
      "New point of interest. Edit details in the panel on the right.",
    image: data.image ?? "",
    link: data.link ?? "",
    type,
    color: data.color ?? hotspotTypeColors[type],
    style: data.style ?? "dot",
    number: data.number !== undefined ? data.number : id,
    icon: data.icon ?? "ℹ",
    markerImage: data.markerImage ?? "",
    pulse: data.pulse ?? false,
    category: data.category ?? "",
    legendName: data.legendName ?? title,
    position,
    blocks: data.blocks ?? [],
  };
}

export const useEditorStore = create<EditorState>((set, get) => ({
  projectName: PROJECT_NAME,
  mode: "select",
  isPreview: false,
  hotspots: [],
  selectedId: null,
  hoveredId: null,
  nextId: 1,
  draggingId: null,
  previewDown: null,
  previewDragged: false,

  setMode: (mode) => {
    if (mode === "preview") {
      const isPreview = !get().isPreview;
      set({
        isPreview,
        mode: isPreview ? "preview" : "select",
        selectedId: isPreview ? null : get().selectedId,
        previewDown: null,
        previewDragged: false,
      });
      return;
    }
    set({
      mode,
      isPreview: false,
      previewDown: null,
      previewDragged: false,
    });
  },

  addHotspot: (position, data = {}) => {
    const id = get().nextId;
    const hotspot = createHotspotData(id, position, data);
    set((state) => ({
      hotspots: [...state.hotspots, hotspot],
      nextId: id + 1,
    }));
    return hotspot;
  },

  updateHotspot: (id, patch) => {
    set((state) => ({
      hotspots: state.hotspots.map((h) =>
        h.id === id ? { ...h, ...patch } : h,
      ),
    }));
  },

  removeHotspot: (id) => {
    set((state) => ({
      hotspots: state.hotspots.filter((h) => h.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    }));
  },

  selectHotspot: (id) => set({ selectedId: id }),

  setHoveredHotspot: (id) => set({ hoveredId: id }),

  setDraggingId: (id) => set({ draggingId: id }),

  setPreviewDown: (value) => set({ previewDown: value }),

  setPreviewDragged: (value) => set({ previewDragged: value }),

  duplicateHotspot: (id) => {
    const source = get().hotspots.find((h) => h.id === id);
    if (!source) return;
    const { id: _id, position, ...rest } = source;
    const title = `${rest.title} (copy)`;
    get().addHotspot(
      {
        x: position.x + 0.5,
        y: position.y,
        z: position.z + 0.5,
      },
      { ...rest, title, legendName: title },
    );
  },

  initDemoHotspots: () => {
    const hotspots = DEMO_HOTSPOTS.map((data, index) =>
      createHotspotData(index + 1, data.position, data),
    );
    set({
      hotspots,
      nextId: hotspots.length + 1,
    });
  },
}));

export const useSelectedHotspot = () =>
  useEditorStore((state) =>
    state.hotspots.find((h) => h.id === state.selectedId) ?? null,
  );
