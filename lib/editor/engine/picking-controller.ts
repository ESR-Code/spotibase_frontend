import type { Entity } from "playcanvas";
import type * as pc from "playcanvas";
import { toast } from "@/lib/editor/toast";
import type { CameraController } from "@/lib/editor/engine/camera-controller";
import type { HotspotManager } from "@/lib/editor/engine/hotspot-manager";
import type { MeshRaycaster } from "@/lib/editor/engine/mesh-raycaster";
import {
  raycastMeshes,
  rayPlaneHit,
  raySphereHit,
  screenRayFromEvent,
} from "@/lib/editor/engine/ray-utils";
import { PREVIEW_CLICK_PX } from "@/lib/editor/constants/default-settings";
import { runHotspotActions } from "@/lib/editor/actions/run-hotspot-actions";
import { useAlignmentSessionStore } from "@/lib/editor/state/alignment-session-store";
import { useCoordsInspectorStore } from "@/lib/editor/state/coords-inspector-store";
import { selectHotspotExclusive } from "@/lib/editor/state/exclusive-selection";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { resolveHotspotAppearance } from "@/lib/editor/state/preview-appearance-store";
import { findHotspot, listPreviewHotspots } from "@/lib/editor/state/preview-hotspots";
import {
  findMeshBoundHotspotId,
  hasMeshBoundHotspots,
} from "@/lib/editor/state/mesh-bindings";
import { usePreviewMeshHighlightStore } from "@/lib/editor/state/preview-mesh-highlight-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import { useUIStore } from "@/lib/editor/state/ui-store";
import { isAlignedGeoReference } from "@/lib/editor/types/geo-reference";
import { isMeshBoundHotspot } from "@/lib/editor/types/hotspot";

export type PickingController = {
  dispose: () => void;
};

/** World units a new hotspot is lifted off the surface along its normal. */
const HOTSPOT_SURFACE_LIFT = 0.1;

export function createPickingController(
  pcModule: typeof pc,
  canvas: HTMLCanvasElement,
  camera: Entity,
  modelRoot: Entity,
  hotspots: HotspotManager,
  cameraCtrl: CameraController,
  meshRaycaster: MeshRaycaster,
): PickingController {
  const dragPlane = new pcModule.Plane();
  const dragOffset = new pcModule.Vec3();
  const planeHit = new pcModule.Vec3();
  const grabPt = new pcModule.Vec3();
  const camForward = new pcModule.Vec3();
  const groundPoint = new pcModule.Vec3();
  const groundNormal = new pcModule.Vec3();
  const groundHit = new pcModule.Vec3();
  const pickRay = new pcModule.Ray();
  const pickHit = new pcModule.Vec3();
  const dragNext = new pcModule.Vec3();
  let dragStartX = 0;
  let dragStartY = 0;
  let didDragHotspot = false;
  /** Editor Select-mode press on empty space; a click (no drag) may select a mesh hotspot. */
  let editorDown: { x: number; y: number } | null = null;

  const activeSceneType = () => {
    const scenes = useScenesStore.getState();
    return (
      scenes.scenes.find((s) => s.id === scenes.activeSceneId)?.type ?? "model"
    );
  };

  // Model grid is the XZ plane at y = 0. Markers stay on or above it.
  const clampModelFloor = (y: number) =>
    activeSceneType() === "model" ? Math.max(0, y) : y;

  const pickHotspotId = (clientX: number, clientY: number): number | null => {
    const ray = screenRayFromEvent(
      pcModule,
      camera,
      canvas,
      clientX,
      clientY,
      pickRay,
    );
    let bestId: number | null = null;
    let bestDist = Infinity;

    const editor = useEditorStore.getState();
    for (const h of listPreviewHotspots()) {
      // Mesh-click hotspots have no marker; the mesh picker handles them.
      if (isMeshBoundHotspot(h)) continue;
      const visual = hotspots.getVisual(h.id);
      if (!visual || !visual.root.enabled) continue;
      const appearance = resolveHotspotAppearance(h, editor.isPreview);
      if (editor.isPreview && appearance.style === "hidden") continue;
      const center = visual.root.getPosition();
      const radius = 0.28 * visual.root.getLocalScale().x;
      if (raySphereHit(ray, center, radius, pcModule, pickHit)) {
        const d = pickHit.distance(ray.origin);
        if (d < bestDist) {
          bestDist = d;
          bestId = h.id;
        }
      }
    }
    return bestId;
  };

  const selectAndOpen = (id: number | null) => {
    if (id == null) {
      useEditorStore.getState().selectHotspot(null);
    } else {
      selectHotspotExclusive(id);
    }
    useUIStore.getState().setPropertiesDrawerOpen(id != null);
  };

  //#region Mesh click (hotspots bound to a model mesh)
  // Picking is a CPU raycast on pointer events only. Hover is coalesced to at
  // most one pick per animation frame, using the latest pointer position.
  let hoverFrame = 0;
  let hoverPending: {
    x: number;
    y: number;
    apply: (id: number | null, clientX: number, clientY: number) => void;
  } | null = null;

  const setHoverMesh = (hotspotId: number | null) => {
    const meshId =
      hotspotId != null ? (findHotspot(hotspotId)?.meshId ?? null) : null;
    usePreviewMeshHighlightStore.getState().setHoverMeshId(meshId);
  };

  const pickMeshHotspotId = (clientX: number, clientY: number) => {
    if (!hasMeshBoundHotspots()) return null;
    return findMeshBoundHotspotId(meshRaycaster.pickMeshId(clientX, clientY));
  };

  const requestMeshHover = (
    clientX: number,
    clientY: number,
    apply: (id: number | null, clientX: number, clientY: number) => void,
  ) => {
    hoverPending = { x: clientX, y: clientY, apply };
    if (hoverFrame) return;
    hoverFrame = requestAnimationFrame(() => {
      hoverFrame = 0;
      const pending = hoverPending;
      hoverPending = null;
      if (!pending) return;
      pending.apply(pickMeshHotspotId(pending.x, pending.y), pending.x, pending.y);
    });
  };

  const cancelMeshHover = () => {
    if (hoverFrame) cancelAnimationFrame(hoverFrame);
    hoverFrame = 0;
    hoverPending = null;
    usePreviewMeshHighlightStore.getState().setHoverMeshId(null);
  };
  //#endregion

  const pickAlignmentLocal = (
    clientX: number,
    clientY: number,
  ): { x: number; y: number; z: number } | null => {
    const ray = screenRayFromEvent(pcModule, camera, canvas, clientX, clientY);
    const meshHit = raycastMeshes(pcModule, modelRoot, ray);
    const type = activeSceneType();

    if (type === "image") {
      groundPoint.set(0, 0, 0);
      groundNormal.set(0, 0, 1);
    } else {
      groundPoint.set(0, 0, 0);
      groundNormal.set(0, 1, 0);
    }
    const hitGround = rayPlaneHit(
      ray,
      groundPoint,
      groundNormal,
      pcModule,
      groundHit,
    );

    if (meshHit) {
      return { x: meshHit.point.x, y: meshHit.point.y, z: meshHit.point.z };
    }
    if (hitGround) {
      return { x: groundHit.x, y: groundHit.y, z: groundHit.z };
    }
    return null;
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    const editor = useEditorStore.getState();

    if (editor.isPreview) {
      const id = pickHotspotId(e.clientX, e.clientY);
      useEditorStore.getState().setPreviewDown({
        x: e.clientX,
        y: e.clientY,
        id,
      });
      useEditorStore.getState().setPreviewDragged(false);
      return;
    }

    const session = useAlignmentSessionStore.getState();
    if (session.open && session.phase === "align") {
      if (session.waitingFor === "local") {
        const hit = pickAlignmentLocal(e.clientX, e.clientY);
        if (hit) {
          session.pickLocal(hit);
          e.stopImmediatePropagation();
        }
      }
      return;
    }

    const id = pickHotspotId(e.clientX, e.clientY);
    if (id != null) {
      if (editor.mode === "select") {
        selectHotspotExclusive(id);
        useEditorStore.getState().setDraggingId(id);
        didDragHotspot = false;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        cameraCtrl.setEnabled(false);

        const visual = hotspots.getVisual(id);
        if (visual) {
          camForward.copy(camera.getPosition()).sub(visual.root.getPosition()).normalize();
          dragPlane.setFromPointNormal(visual.root.getPosition(), camForward);

          const ray = screenRayFromEvent(
            pcModule,
            camera,
            canvas,
            e.clientX,
            e.clientY,
          );
          if (dragPlane.intersectsRay(ray, grabPt)) {
            dragOffset.copy(visual.root.getPosition()).sub(grabPt);
          } else {
            dragOffset.set(0, 0, 0);
          }
        }
        e.stopImmediatePropagation();
      }
      return;
    }

    if (editor.mode === "add") {
      const ray = screenRayFromEvent(pcModule, camera, canvas, e.clientX, e.clientY);
      // Exact surface hit; AABB only if the mesh catalog is empty.
      const surface =
        meshRaycaster.pickSurfacePoint(e.clientX, e.clientY) ??
        (() => {
          const box = raycastMeshes(pcModule, modelRoot, ray);
          return box ? { point: box.point, normal: null } : null;
        })();
      if (surface) {
        // Small lift along the normal so the marker sits on, not in, the surface.
        const { point, normal } = surface;
        const position = {
          x: point.x + (normal?.x ?? 0) * HOTSPOT_SURFACE_LIFT,
          y: clampModelFloor(point.y + (normal?.y ?? 0) * HOTSPOT_SURFACE_LIFT),
          z: point.z + (normal?.z ?? 0) * HOTSPOT_SURFACE_LIFT,
        };
        const created = useEditorStore.getState().addHotspot(position);
        hotspots.syncFromStore();
        selectAndOpen(created.id);
        useEditorStore.getState().setMode("select");
        toast.success("Hotspot added — drag to reposition");
        e.stopImmediatePropagation();
      }
    } else if (editor.mode === "select") {
      const scenes = useScenesStore.getState();
      const active =
        scenes.scenes.find((s) => s.id === scenes.activeSceneId) ?? null;
      const inspecting =
        isAlignedGeoReference(active?.geoReference) &&
        useCoordsInspectorStore.getState().clickInspectEnabled;
      if (inspecting) {
        const ray = screenRayFromEvent(
          pcModule,
          camera,
          canvas,
          e.clientX,
          e.clientY,
        );
        const hit = raycastMeshes(pcModule, modelRoot, ray);
        if (hit) {
          useCoordsInspectorStore.getState().setLocal({
            x: hit.point.x,
            y: hit.point.y,
            z: hit.point.z,
          });
          const ui = useUIStore.getState();
          ui.setOutlinerCollapsed(false);
          ui.setOutlinerTab("subject");
        }
      }
      selectAndOpen(null);
      // Coords inspect owns clicks while it's on.
      editorDown = inspecting ? null : { x: e.clientX, y: e.clientY };
    }
  };

  /** Hover state for the hotspot under the pointer (marker or mesh) in Preview. */
  const applyPreviewHover = (id: number | null, clientX: number, clientY: number) => {
    useEditorStore.getState().setHoveredHotspot(id);
    setHoverMesh(id);
    const ui = useUIStore.getState();
    const settings = useSettingsStore.getState();
    const activeId = ui.previewActiveHotspotId;
    const rect = canvas.getBoundingClientRect();

    if (ui.previewShowAllLabels) {
      if (ui.hoverTooltip) ui.setHoverTooltip(null);
    } else if (id != null && id !== activeId) {
      // Hovering a different hotspot — follow the cursor.
      const hovered = findHotspot(id);
      ui.setHoverTooltip({
        x: clientX - rect.left,
        y: clientY - rect.top,
        title: hovered
          ? resolveHotspotAppearance(hovered, true).title
          : "",
        pinned: false,
      });
    } else if (id === activeId) {
      // Still over the selected marker — never stick the label to the mouse.
      // Select-pinned label is handled by the hotspot manager after reveal.
      if (
        !settings.previewShowLabelOnSelect ||
        ui.previewLabelPending ||
        ui.hoverTooltip?.pinned !== true
      ) {
        ui.setHoverTooltip(null);
      }
    } else {
      const keepSelectLabel =
        settings.previewShowLabelOnSelect &&
        activeId != null &&
        !ui.previewLabelPending;
      if (!keepSelectLabel) {
        ui.setHoverTooltip(null);
      }
    }
    canvas.style.cursor = id != null ? "pointer" : "grab";
  };

  /** Editor Select mode: highlight a clickable mesh under the pointer. */
  const applyEditorHover = (id: number | null) => {
    setHoverMesh(id);
    canvas.style.cursor = id != null ? "pointer" : "";
  };

  const onPointerMove = (e: PointerEvent) => {
    const editor = useEditorStore.getState();

    if (editor.isPreview && editor.previewDown) {
      const dx = e.clientX - editor.previewDown.x;
      const dy = e.clientY - editor.previewDown.y;
      if (dx * dx + dy * dy > PREVIEW_CLICK_PX * PREVIEW_CLICK_PX) {
        useEditorStore.getState().setPreviewDragged(true);
        canvas.style.cursor = "grabbing";
      }
    }

    if (editor.isPreview && editor.draggingId == null) {
      const markerId = pickHotspotId(e.clientX, e.clientY);
      // The hotspot marker wins; otherwise ask the mesh picker (skip while orbiting).
      if (markerId != null || !hasMeshBoundHotspots()) {
        hoverPending = null;
        applyPreviewHover(markerId, e.clientX, e.clientY);
      } else if (!editor.previewDown) {
        requestMeshHover(e.clientX, e.clientY, applyPreviewHover);
      }
    } else if (!editor.isPreview) {
      useUIStore.getState().setHoverTooltip(null);
      if (
        editor.mode === "select" &&
        editor.draggingId == null &&
        !editorDown &&
        hasMeshBoundHotspots() &&
        pickHotspotId(e.clientX, e.clientY) == null
      ) {
        requestMeshHover(e.clientX, e.clientY, applyEditorHover);
      } else if (usePreviewMeshHighlightStore.getState().hoverMeshId) {
        cancelMeshHover();
        canvas.style.cursor = "";
      }
    }

    if (editor.draggingId != null) {
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      if (dx * dx + dy * dy > PREVIEW_CLICK_PX * PREVIEW_CLICK_PX) {
        didDragHotspot = true;
      }
      const ray = screenRayFromEvent(
        pcModule,
        camera,
        canvas,
        e.clientX,
        e.clientY,
        pickRay,
      );
      if (dragPlane.intersectsRay(ray, planeHit)) {
        dragNext.copy(planeHit).add(dragOffset);
        hotspots.setWorldPosition(editor.draggingId, {
          x: dragNext.x,
          y: clampModelFloor(dragNext.y),
          z: dragNext.z,
        });
      }
      e.stopImmediatePropagation();
    }
  };

  const onPointerUp = (e: PointerEvent) => {
    const editor = useEditorStore.getState();

    if (editor.isPreview && editor.previewDown) {
      const down = editor.previewDown;
      useEditorStore.getState().setPreviewDown(null);
      if (!editor.previewDragged && down.id != null) {
        const id = pickHotspotId(e.clientX, e.clientY);
        if (id === down.id) {
          runHotspotActions(id);
        }
      } else if (!editor.previewDragged) {
        // No marker under the press: a mesh-click hotspot may be.
        const id = pickMeshHotspotId(e.clientX, e.clientY);
        if (id != null) runHotspotActions(id);
      }
      useEditorStore.getState().setPreviewDragged(false);
      if (useUIStore.getState().previewActiveHotspotId == null) {
        useEditorStore
          .getState()
          .setHoveredHotspot(pickHotspotId(e.clientX, e.clientY));
      }
    }

    if (editorDown && !editor.isPreview) {
      const down = editorDown;
      editorDown = null;
      const dx = e.clientX - down.x;
      const dy = e.clientY - down.y;
      const isClick = dx * dx + dy * dy <= PREVIEW_CLICK_PX * PREVIEW_CLICK_PX;
      if (isClick && editor.mode === "select") {
        // Clicking a clickable mesh opens its hotspot, like clicking a marker.
        const id = pickMeshHotspotId(e.clientX, e.clientY);
        if (id != null) selectAndOpen(id);
      }
    }

    if (editor.draggingId != null) {
      const draggedId = editor.draggingId;
      if (didDragHotspot) {
        hotspots.commitWorldPosition(draggedId);
      } else {
        useUIStore.getState().setPropertiesDrawerOpen(true);
      }
      didDragHotspot = false;
      useEditorStore.getState().setDraggingId(null);
      cameraCtrl.setEnabled(true);
    }
  };

  const onPointerLeave = () => {
    cancelMeshHover();
    if (useEditorStore.getState().isPreview) {
      useEditorStore.getState().setHoveredHotspot(null);
      const ui = useUIStore.getState();
      const keepSelectLabel =
        useSettingsStore.getState().previewShowLabelOnSelect &&
        ui.previewActiveHotspotId != null &&
        !ui.previewLabelPending;
      if (!keepSelectLabel) {
        ui.setHoverTooltip(null);
      }
      canvas.style.cursor = "";
    }
  };

  canvas.addEventListener("pointerdown", onPointerDown, true);
  canvas.addEventListener("pointermove", onPointerMove, true);
  window.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointerleave", onPointerLeave);

  return {
    dispose: () => {
      canvas.removeEventListener("pointerdown", onPointerDown, true);
      canvas.removeEventListener("pointermove", onPointerMove, true);
      window.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      if (hoverFrame) cancelAnimationFrame(hoverFrame);
      canvas.style.cursor = "";
    },
  };
}
