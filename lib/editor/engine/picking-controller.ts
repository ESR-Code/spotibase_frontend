import type { Entity } from "playcanvas";
import type * as pc from "playcanvas";
import { toast } from "sonner";
import type { CameraController } from "@/lib/editor/engine/camera-controller";
import type { HotspotManager } from "@/lib/editor/engine/hotspot-manager";
import {
  raycastMeshes,
  raySphereHit,
  screenRayFromEvent,
} from "@/lib/editor/engine/ray-utils";
import { PREVIEW_CLICK_PX } from "@/lib/editor/constants/default-settings";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import { useUIStore } from "@/lib/editor/state/ui-store";

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

  const pickHotspotId = (clientX: number, clientY: number): number | null => {
    const ray = screenRayFromEvent(pcModule, camera, canvas, clientX, clientY);
    const editor = useEditorStore.getState();
    let bestId: number | null = null;
    let bestDist = Infinity;
    const hit = new pcModule.Vec3();

    for (const h of editor.hotspots) {
      const visual = hotspots.getVisual(h.id);
      if (!visual) continue;
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
    useEditorStore.getState().selectHotspot(id);
    useUIStore.getState().setPropertiesDrawerOpen(id != null);
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

    const id = pickHotspotId(e.clientX, e.clientY);
    if (id != null) {
      if (editor.mode === "select") {
        selectAndOpen(id);
        useEditorStore.getState().setDraggingId(id);
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
      const rect = canvas.getBoundingClientRect();
      useUIStore.getState().setHoverTooltip(
        id != null
          ? {
              x: e.clientX - rect.left,
              y: e.clientY - rect.top,
              title:
                editor.hotspots.find((h) => h.id === id)?.title ?? "",
            }
          : null,
      );
      canvas.style.cursor = id != null ? "pointer" : "grab";
    } else if (!editor.isPreview) {
      useUIStore.getState().setHoverTooltip(null);
    }

    if (editor.draggingId != null) {
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
          const index = editor.hotspots.findIndex((h) => h.id === id);
          if (index >= 0) {
            const hotspot = editor.hotspots[index];
            window.dispatchEvent(
              new CustomEvent("editor:focus-hotspot", {
                detail: { id: hotspot.id },
              }),
            );
            if (
              useSettingsStore.getState().markerDialogPresentation === "off"
            ) {
              return;
            }
            useUIStore.getState().setPreviewModalIndex(index);
            useUIStore.getState().setPreviewModalOpen(true);
          }
        }
      }
      useEditorStore.getState().setPreviewDragged(false);
      useEditorStore.getState().setHoveredHotspot(pickHotspotId(e.clientX, e.clientY));
    }

    if (editor.draggingId != null) {
      useEditorStore.getState().setDraggingId(null);
      cameraCtrl.setEnabled(true);
    }
  };

  const onPointerLeave = () => {
    if (useEditorStore.getState().isPreview) {
      useEditorStore.getState().setHoveredHotspot(null);
      useUIStore.getState().setHoverTooltip(null);
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
