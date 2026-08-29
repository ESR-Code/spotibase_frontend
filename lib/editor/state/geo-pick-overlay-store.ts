import { create } from "zustand";

export type ProjectedMarkerKind = "alignment" | "inspect" | "reverse";

export type ProjectedMarker = {
  id: string;
  label: string;
  x: number;
  y: number;
  visible: boolean;
  kind: ProjectedMarkerKind;
};

type GeoPickOverlayState = {
  markers: ProjectedMarker[];
  setMarkers: (markers: ProjectedMarker[]) => void;
};

function sameMarkers(a: ProjectedMarker[], b: ProjectedMarker[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const l = a[i]!;
    const r = b[i]!;
    if (
      l.id !== r.id ||
      l.label !== r.label ||
      l.kind !== r.kind ||
      l.visible !== r.visible ||
      Math.abs(l.x - r.x) > 0.5 ||
      Math.abs(l.y - r.y) > 0.5
    ) {
      return false;
    }
  }
  return true;
}

export const useGeoPickOverlayStore = create<GeoPickOverlayState>((set, get) => ({
  markers: [],
  setMarkers: (markers) => {
    if (sameMarkers(get().markers, markers)) return;
    set({ markers });
  },
}));
