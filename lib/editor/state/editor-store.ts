import { create } from "zustand";
import {
  cloneActionGraph,
  createDefaultActionGraph,
} from "@/lib/editor/actions/create-action-graph";
import { clearHttpRequestCache } from "@/lib/editor/actions/http-request";
import { clearPostMessageListeners } from "@/lib/editor/actions/send-post-message";
import { cloneCameraResetPosition } from "@/lib/editor/constants/default-settings";
import { DEMO_HOTSPOTS } from "@/lib/editor/constants/demo-hotspots";
import {
  getSeedHotspots,
  getSeedNextHotspotId,
} from "@/lib/editor/constants/seed-scene";
import { usePreviewAppearanceStore } from "@/lib/editor/state/preview-appearance-store";
import { usePreviewVisibilityStore } from "@/lib/editor/state/preview-visibility-store";
import { hotspotTypeColors, PROJECT_NAME } from "@/lib/editor/theme/tokens";
import type { EditorMode, Hotspot, Vec3 } from "@/lib/editor/types/hotspot";

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
  loadScene: (hotspots: Hotspot[], nextId: number) => void;
};

function createHotspotData(
  id: number,
  position: Vec3,
  data: Partial<Omit<Hotspot, "id" | "position">> = {},
): Hotspot {
  const type = data.type ?? "none";
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
    icon: data.icon ?? "Info",
    markerImage: data.markerImage ?? "",
    pulse: data.pulse ?? false,
    enabled: data.enabled ?? true,
    category: data.category ?? "",
    legendName: data.legendName ?? title,
    position,
    blocks: data.blocks ?? [],
    customCameraEnabled: data.customCameraEnabled ?? false,
    customCamera: cloneCameraResetPosition(data.customCamera ?? null),
    actions: data.actions
      ? cloneActionGraph(data.actions)
      : createDefaultActionGraph(),
  };
}

export const useEditorStore = create<EditorState>((set, get) => ({
  projectName: PROJECT_NAME,
  mode: "select",
  isPreview: false,
  hotspots: getSeedHotspots(),
  selectedId: null,
  hoveredId: null,
  nextId: getSeedNextHotspotId(),
  draggingId: null,
  previewDown: null,
  previewDragged: false,

  setMode: (mode) => {
    if (mode === "preview") {
      const isPreview = !get().isPreview;
      clearHttpRequestCache();
      clearPostMessageListeners();
      usePreviewVisibilityStore.getState().reset();
      usePreviewAppearanceStore.getState().reset();
      set({
        isPreview,
        mode: isPreview ? "preview" : "select",
        selectedId: isPreview ? null : get().selectedId,
        previewDown: null,
        previewDragged: false,
      });
      if (isPreview) {
        void import("@/lib/editor/actions/run-action-graph").then(
          ({ runPreviewStartActions }) => {
            void runPreviewStartActions();
          },
        );
      }
      return;
    }
    if (get().isPreview) {
      clearHttpRequestCache();
      clearPostMessageListeners();
      usePreviewVisibilityStore.getState().reset();
      usePreviewAppearanceStore.getState().reset();
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

  loadScene: (hotspots, nextId) => {
    set({
      hotspots: hotspots.map((h) => ({
        ...h,
        position: { ...h.position },
        blocks: [...h.blocks],
        enabled: h.enabled ?? true,
        customCameraEnabled: h.customCameraEnabled ?? false,
        customCamera: cloneCameraResetPosition(h.customCamera ?? null),
        actions: h.actions
          ? cloneActionGraph(h.actions)
          : createDefaultActionGraph(),
      })),
      nextId,
      selectedId: null,
      hoveredId: null,
      draggingId: null,
      previewDown: null,
      previewDragged: false,
    });
  },
}));

export const useSelectedHotspot = () =>
  useEditorStore((state) =>
    state.hotspots.find((h) => h.id === state.selectedId) ?? null,
  );
