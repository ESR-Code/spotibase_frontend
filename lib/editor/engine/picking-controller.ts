import type { Entity } from "playcanvas";
import type * as pc from "playcanvas";
import { toast } from "@/lib/editor/toast";
import type { CameraController } from "@/lib/editor/engine/camera-controller";
import type { HotspotManager } from "@/lib/editor/engine/hotspot-manager";
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
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import { useUIStore } from "@/lib/editor/state/ui-store";
import { isAlignedGeoReference } from "@/lib/editor/types/geo-reference";

export type PickingController = {
  dispose: () => void;
};

export function createPickingController(
  pcModule: typeof pc,
  canvas: HTMLCanvasElement,
  camera: Entity,
  modelRoot: Entity,
  hotspots: HotspotManager,
  cameraCtrl: CameraController,
): PickingController {
  const dragPlane = new pcModule.Plane();
  const dragOffset = new pcModule.Vec3();
  const planeHit = new pcModule.Vec3();
  const grabPt = new pcModule.Vec3();
  const camForward = new pcModule.Vec3();
  const groundPoint = new pcModule.Vec3();
  const groundNormal = new pcModule.Vec3();
  const groundHit = new pcModule.Vec3();
  let dragStartX = 0;
  let dragStartY = 0;
  let didDragHotspot = false;

  const pickHotspotId = (clientX: number, clientY: number): number | null => {
    const ray = screenRayFromEvent(pcModule, camera, canvas, clientX, clientY);
    let bestId: number | null = null;
    let bestDist = Infinity;
    const hit = new pcModule.Vec3();

    const editor = useEditorStore.getState();
    for (const h of listPreviewHotspots()) {
      const visual = hotspots.getVisual(h.id);
      if (!visual || !visual.root.enabled) continue;
      const appearance = resolveHotspotAppearance(h, editor.isPreview);
      if (editor.isPreview && appearance.style === "hidden") continue;
      const center = visual.root.getPosition();
      const radius = 0.28 * visual.root.getLocalScale().x;
      if (raySphereHit(ray, center, radius, pcModule, hit)) {
        const d = hit.distance(ray.origin);
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

  const pickAlignmentLocal = (
    clientX: number,
    clientY: number,
  ): { x: number; y: number; z: number } | null => {
    const ray = screenRayFromEvent(pcModule, camera, canvas, clientX, clientY);
    const meshHit = raycastMeshes(pcModule, modelRoot, ray);
    const scenes = useScenesStore.getState();
    const type =
      scenes.scenes.find((s) => s.id === scenes.activeSceneId)?.type ?? "model";

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
      const hit = raycastMeshes(pcModule, modelRoot, ray);
      if (hit) {
        const position = {
          x: hit.point.x,
          y: hit.point.y + 0.3,
          z: hit.point.z,
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
      if (
        isAlignedGeoReference(active?.geoReference) &&
        useCoordsInspectorStore.getState().clickInspectEnabled
      ) {
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
    }
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
      const id = pickHotspotId(e.clientX, e.clientY);
      useEditorStore.getState().setHoveredHotspot(id);
      const ui = useUIStore.getState();
      const settings = useSettingsStore.getState();
      const activeId = ui.previewActiveHotspotId;
      const rect = canvas.getBoundingClientRect();

      if (id != null && id !== activeId) {
        // Hovering a different hotspot — follow the cursor.
        const hovered = findHotspot(id);
        ui.setHoverTooltip({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
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
    } else if (!editor.isPreview) {
      useUIStore.getState().setHoverTooltip(null);
    }

    if (editor.draggingId != null) {
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      if (dx * dx + dy * dy > PREVIEW_CLICK_PX * PREVIEW_CLICK_PX) {
        didDragHotspot = true;
      }
      const ray = screenRayFromEvent(pcModule, camera, canvas, e.clientX, e.clientY);
      if (dragPlane.intersectsRay(ray, planeHit)) {
        const next = new pcModule.Vec3().copy(planeHit).add(dragOffset);
        hotspots.setWorldPosition(editor.draggingId, {
          x: next.x,
          y: next.y,
          z: next.z,
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
      }
      useEditorStore.getState().setPreviewDragged(false);
      if (useUIStore.getState().previewActiveHotspotId == null) {
        useEditorStore
          .getState()
          .setHoveredHotspot(pickHotspotId(e.clientX, e.clientY));
      }
    }

    if (editor.draggingId != null) {
      if (!didDragHotspot) {
        useUIStore.getState().setPropertiesDrawerOpen(true);
      }
      didDragHotspot = false;
      useEditorStore.getState().setDraggingId(null);
      cameraCtrl.setEnabled(true);
    }
  };

  const onPointerLeave = () => {
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
      canvas.style.cursor = "";
    },
  };
}
