import { create } from "zustand";
import { toast } from "sonner";
import { buildGeoReference } from "@/lib/editor/coords/build-geo-reference";
import { useCoordsInspectorStore } from "@/lib/editor/state/coords-inspector-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import type {
  AlignmentControlPoint,
  AlignmentMethod,
  CoordVec3,
  GeoPoint,
  SceneTransform,
} from "@/lib/editor/types/geo-reference";
import {
  alignmentMethodForSceneType,
  cloneGeoPoint,
  requiredControlPointCount,
} from "@/lib/editor/types/geo-reference";

export type AlignmentWaitingFor = "local" | "geo" | "done";

export type DraftControlPoint = {
  id: string;
  local: CoordVec3 | null;
  geo: GeoPoint | null;
};

export type AlignmentPreview = {
  ok: boolean;
  error?: string;
  residualRms?: number;
  transform?: SceneTransform;
  origin?: GeoPoint;
};

type AlignmentSessionState = {
  open: boolean;
  phase: "select-geo" | "align";
  sceneId: string | null;
  geoSceneId: string | null;
  method: AlignmentMethod | null;
  points: DraftControlPoint[];
  waitingFor: AlignmentWaitingFor;
  preview: AlignmentPreview | null;
  begin: (sceneId: string) => void;
  selectGeoScene: (geoSceneId: string) => void;
  pickLocal: (local: CoordVec3) => void;
  pickGeo: (geo: GeoPoint) => void;
  undoLast: () => void;
  resetPoints: () => void;
  apply: () => boolean;
  cancel: () => void;
};

function emptyPoints(method: AlignmentMethod): DraftControlPoint[] {
  const n = requiredControlPointCount(method);
  return Array.from({ length: n }, (_, i) => ({
    id: `cp-${i + 1}`,
    local: null,
    geo: null,
  }));
}

function waitingFrom(points: DraftControlPoint[]): AlignmentWaitingFor {
  for (const p of points) {
    if (!p.local) return "local";
    if (!p.geo) return "geo";
  }
  return "done";
}

function toCompletePoints(
  points: DraftControlPoint[],
): AlignmentControlPoint[] | null {
  const out: AlignmentControlPoint[] = [];
  for (const p of points) {
    if (!p.local || !p.geo) return null;
    out.push({ id: p.id, local: { ...p.local }, geo: cloneGeoPoint(p.geo) });
  }
  return out;
}

function makePreview(
  geoSceneId: string | null,
  method: AlignmentMethod | null,
  points: DraftControlPoint[],
): AlignmentPreview | null {
  if (!geoSceneId || !method) return null;
  const complete = toCompletePoints(points);
  if (!complete) return null;
  const built = buildGeoReference({
    geoSceneId,
    alignmentMethod: method,
    controlPoints: complete,
  });
  if (!built.ok) return { ok: false, error: built.error };
  return {
    ok: true,
    residualRms: built.residualRms,
    transform: built.geoReference.transform,
    origin: built.geoReference.origin,
  };
}

function loadExistingPoints(
  method: AlignmentMethod,
  existing: AlignmentControlPoint[] | undefined,
): DraftControlPoint[] {
  const base = emptyPoints(method);
  if (!existing) return base;
  return base.map((slot, i) => {
    const src = existing[i];
    if (!src) return slot;
    return {
      id: src.id || slot.id,
      local: { ...src.local },
      geo: cloneGeoPoint(src.geo),
    };
  });
}

export const useAlignmentSessionStore = create<AlignmentSessionState>(
  (set, get) => ({
    open: false,
    phase: "select-geo",
    sceneId: null,
    geoSceneId: null,
    method: null,
    points: [],
    waitingFor: "local",
    preview: null,

    begin: (sceneId) => {
      const scene = useScenesStore.getState().scenes.find((s) => s.id === sceneId);
      if (!scene) return;
      const method = alignmentMethodForSceneType(scene.type);
      if (!method) return;

      const geoScenes = useScenesStore
        .getState()
        .scenes.filter((s) => s.type === "geo");
      if (geoScenes.length === 0) {
        toast.error("Add a Geo Map scene before georeferencing");
        return;
      }

      const existing = scene.geoReference;
      const geoSceneId =
        existing && geoScenes.some((s) => s.id === existing.geoSceneId)
          ? existing.geoSceneId
          : geoScenes.length === 1
            ? geoScenes[0]!.id
            : null;

      if (geoSceneId) {
        const points = loadExistingPoints(method, existing?.controlPoints);
        set({
          open: true,
          phase: "align",
          sceneId,
          geoSceneId,
          method,
          points,
          waitingFor: waitingFrom(points),
          preview: makePreview(geoSceneId, method, points),
        });
        return;
      }

      set({
        open: true,
        phase: "select-geo",
        sceneId,
        geoSceneId: null,
        method,
        points: emptyPoints(method),
        waitingFor: "local",
        preview: null,
      });
    },

    selectGeoScene: (geoSceneId) => {
      const state = get();
      if (!state.method || !state.sceneId) return;
      const scene = useScenesStore
        .getState()
        .scenes.find((s) => s.id === state.sceneId);
      const reuse =
        scene?.geoReference?.geoSceneId === geoSceneId
          ? scene.geoReference.controlPoints
          : undefined;
      const points = loadExistingPoints(state.method, reuse);
      set({
        phase: "align",
        geoSceneId,
        points,
        waitingFor: waitingFrom(points),
        preview: makePreview(geoSceneId, state.method, points),
      });
    },

    pickLocal: (local) => {
      const state = get();
      if (!state.open || state.phase !== "align" || state.waitingFor !== "local") {
        return;
      }
      const index = state.points.findIndex((p) => !p.local);
      if (index < 0) return;
      const points = state.points.map((p, i) =>
        i === index ? { ...p, local: { ...local } } : p,
      );
      set({
        points,
        waitingFor: waitingFrom(points),
        preview: makePreview(state.geoSceneId, state.method, points),
      });
    },

    pickGeo: (geo) => {
      const state = get();
      if (!state.open || state.phase !== "align" || state.waitingFor !== "geo") {
        return;
      }
      const index = state.points.findIndex((p) => p.local && !p.geo);
      if (index < 0) return;
      const points = state.points.map((p, i) =>
        i === index ? { ...p, geo: cloneGeoPoint(geo) } : p,
      );
      set({
        points,
        waitingFor: waitingFrom(points),
        preview: makePreview(state.geoSceneId, state.method, points),
      });
    },

    undoLast: () => {
      const state = get();
      const points = state.points.map((p) => ({
        ...p,
        local: p.local ? { ...p.local } : null,
        geo: p.geo ? cloneGeoPoint(p.geo) : null,
      }));
      for (let i = points.length - 1; i >= 0; i--) {
        if (points[i]!.geo) {
          points[i] = { ...points[i]!, geo: null };
          break;
        }
        if (points[i]!.local) {
          points[i] = { ...points[i]!, local: null };
          break;
        }
      }
      set({
        points,
        waitingFor: waitingFrom(points),
        preview: makePreview(state.geoSceneId, state.method, points),
      });
    },

    resetPoints: () => {
      const state = get();
      if (!state.method) return;
      const points = emptyPoints(state.method);
      set({
        points,
        waitingFor: "local",
        preview: null,
      });
    },

    apply: () => {
      const state = get();
      if (!state.sceneId || !state.geoSceneId || !state.method) return false;

      const complete = toCompletePoints(state.points);
      if (!complete) {
        const saved = useScenesStore
          .getState()
          .scenes.find((scene) => scene.id === state.sceneId)?.geoReference;
        if (!saved) {
          toast.error("Finish picking all alignment points first");
          return false;
        }
        useScenesStore.getState().setSceneGeoReference(state.sceneId, null);
        useCoordsInspectorStore.getState().reset();
        toast.success("Alignment cleared");
        get().cancel();
        return true;
      }

      const built = buildGeoReference({
        geoSceneId: state.geoSceneId,
        alignmentMethod: state.method,
        controlPoints: complete,
      });
      if (!built.ok) {
        toast.error(built.error);
        return false;
      }
      useScenesStore
        .getState()
        .setSceneGeoReference(state.sceneId, built.geoReference);
      useCoordsInspectorStore.getState().reset();
      toast.success("Alignment applied");
      get().cancel();
      return true;
    },

    cancel: () => {
      set({
        open: false,
        phase: "select-geo",
        sceneId: null,
        geoSceneId: null,
        method: null,
        points: [],
        waitingFor: "local",
        preview: null,
      });
    },
  }),
);

export function alignmentStepLabel(
  method: AlignmentMethod | null,
  waitingFor: AlignmentWaitingFor,
  points: DraftControlPoint[],
): string {
  if (!method) return "Select a Geo Map scene";
  const pair = points.findIndex((p) => !p.local || !p.geo) + 1 || points.length;
  const total = requiredControlPointCount(method);
  if (waitingFor === "done") return "Review the alignment, then apply";
  if (waitingFor === "local") {
    return `Pick point ${pair} of ${total} in the ${method === "3-point" ? "3D" : "2D"} scene`;
  }
  return `Pick corresponding point ${pair} of ${total} on the Geo Map`;
}
