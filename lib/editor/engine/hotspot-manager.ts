import type { Application, Entity } from "playcanvas";
import type * as pc from "playcanvas";
import {
  createHotspotVisual,
  destroyHotspotVisual,
  rebuildCore,
  visualStyleKey,
  type HotspotVisual,
} from "@/lib/editor/engine/hotspot-visuals";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { findHotspot, listPreviewHotspots } from "@/lib/editor/state/preview-hotspots";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import { useUIStore } from "@/lib/editor/state/ui-store";
import {
  isPreviewHotspotEnabled,
} from "@/lib/editor/state/preview-visibility-store";
import { resolveHotspotAppearance } from "@/lib/editor/state/preview-appearance-store";
import { PIN_SPRITE_SCALE } from "@/lib/editor/constants/default-settings";
import {
  isHiddenHotspotStyle,
  normalizeHotspotShape,
  type Vec3,
} from "@/lib/editor/types/hotspot";
import { LEGEND_CATEGORY_ALL } from "@/lib/editor/types/legend-category";

export type HotspotManager = {
  syncFromStore: () => void;
  update: (dt: number) => void;
  getVisual: (id: number) => HotspotVisual | undefined;
  /** Move the live entity only. Does not write the store (use during drag). */
  setWorldPosition: (id: number, position: Vec3) => void;
  /** Persist the live entity position to the authored hotspot. */
  commitWorldPosition: (id: number) => void;
  dispose: () => void;
};

export function createHotspotManager(
  app: Application,
  pcModule: typeof pc,
  hotspotRoot: Entity,
  camera: Entity,
): HotspotManager {
  const visuals = new Map<number, HotspotVisual>();
  let elapsed = 0;
  const screenPos = new pcModule.Vec3();
  const toHotspot = new pcModule.Vec3();
  const OPACITY_EPS = 0.01;
  const SCREEN_EPS = 0.5;

  const syncFromStore = () => {
    const { isPreview, draggingId } = useEditorStore.getState();
    const hotspots = listPreviewHotspots();
    const alive = new Set(hotspots.map((h) => h.id));

    for (const [id, visual] of visuals) {
      if (!alive.has(id)) {
        destroyHotspotVisual(visual);
        visuals.delete(id);
      }
    }

    for (const hotspot of hotspots) {
      const resolved = resolveHotspotAppearance(hotspot, isPreview);
      const existing = visuals.get(hotspot.id);
      if (!existing) {
        const visual = createHotspotVisual(app, pcModule, resolved);
        hotspotRoot.addChild(visual.root);
        visuals.set(hotspot.id, visual);
        continue;
      }

      // Drag owns the live transform until pointerup commits it.
      if (draggingId !== hotspot.id) {
        const live = existing.root.getPosition();
        if (
          live.x !== hotspot.position.x ||
          live.y !== hotspot.position.y ||
          live.z !== hotspot.position.z
        ) {
          existing.root.setPosition(
            hotspot.position.x,
            hotspot.position.y,
            hotspot.position.z,
          );
        }
      }

      const nextKey = visualStyleKey(resolved);
      if (existing.styleKey !== nextKey) {
        void rebuildCore(app, pcModule, existing, resolved);
      } else {
        const hidden = isHiddenHotspotStyle(resolved.style);
        existing.ring.enabled = !!resolved.pulse && !hidden;
        existing.stick.enabled =
          !!resolved.wick && resolved.style !== "image" && !hidden;
      }
    }
  };

  const setMaterialOpacity = (
    mat: { opacity: number; blendType: number; update: () => void },
    opacity: number,
    blendType: number,
  ) => {
    if (
      Math.abs(mat.opacity - opacity) < OPACITY_EPS &&
      mat.blendType === blendType
    ) {
      return;
    }
    mat.opacity = opacity;
    mat.blendType = blendType;
    mat.update();
  };

  const update = (dt: number) => {
    elapsed += dt;
    const t = elapsed;
    const settings = useSettingsStore.getState();
    const editor = useEditorStore.getState();
    const ui = useUIStore.getState();
    const camPos = camera.getPosition();
    const camRot = camera.getRotation();
    const refDist = settings.hotspotRefDist;
    const previewActiveId = ui.previewActiveHotspotId;

    const legendFilter = ui.legendFilterCategory;
    const filterByLegend =
      editor.isPreview && legendFilter !== LEGEND_CATEGORY_ALL;

    let index = 0;
    for (const hotspot of listPreviewHotspots()) {
      const visual = visuals.get(hotspot.id);
      if (!visual) {
        index += 1;
        continue;
      }

      const resolved = resolveHotspotAppearance(hotspot, editor.isPreview);
      const hiddenStyle = isHiddenHotspotStyle(resolved.style);
      const categoryVisible =
        !filterByLegend || hotspot.category === legendFilter;
      const enabled =
        categoryVisible &&
        !(editor.isPreview && hiddenStyle) &&
        (!editor.isPreview ||
          isPreviewHotspotEnabled(editor.isPreview, hotspot.id));
      if (visual.root.enabled !== enabled) {
        visual.root.enabled = enabled;
      }
      if (!enabled) {
        index += 1;
        continue;
      }

      const pos = visual.root.getPosition();
      const dist = pos.distance(camPos);
      const zoomScale = (dist / refDist) * settings.hotspotSize;
      let accent = 1;
      if (hotspot.id === editor.selectedId) accent = 1.25;
      else if (editor.isPreview && hotspot.id === previewActiveId) accent = 1.25;
      else if (editor.isPreview && hotspot.id === editor.hoveredId) accent = 1.22;
      const scale = Math.max(0.02, zoomScale * accent);
      visual.root.setLocalScale(scale, scale, scale);

      const isPreviewActive =
        editor.isPreview && hotspot.id === previewActiveId;
      if (hotspot.id === editor.selectedId || isPreviewActive) {
        setMaterialOpacity(
          visual.haloMat,
          0.15 + Math.sin(t * 4) * 0.08,
          pcModule.BLEND_NORMAL,
        );
      } else {
        setMaterialOpacity(visual.haloMat, 0, visual.haloMat.blendType);
      }

      if (visual.ring.enabled) {
        // Expanding fade ring: grows out while opacity eases to 0, then loops
        const cycle = ((t * 0.55 + index * 0.37) % 1 + 1) % 1;
        const ease = 1 - Math.pow(1 - cycle, 2.2);
        const ringScale = 0.38 + ease * 1.15;
        const pinBoost =
          normalizeHotspotShape(resolved.shape) === "pin"
            ? PIN_SPRITE_SCALE
            : 1;
        visual.ring.setLocalScale(ringScale * pinBoost, 1, ringScale * pinBoost);
        setMaterialOpacity(
          visual.ringMat,
          (1 - ease) * 0.78,
          pcModule.BLEND_NORMAL,
        );
        visual.ring.setRotation(camRot);
        visual.ring.rotateLocal(-90, 0, 0);
      }

      if (visual.coreTexture && visual.core) {
        visual.core.setRotation(camRot);
        visual.core.rotateLocal(-90, 0, 0);
      }

      index += 1;
    }

    // Pin title label to the selected preview hotspot after the click reveal delay.
    // Skip while hovering a *different* hotspot (that uses the mouse-follow label).
    // Skip when the info box is open — it occupies the same screen space.
    const hoveringOther =
      editor.hoveredId != null && editor.hoveredId !== previewActiveId;
    const infoBoxOpen =
      ui.previewModalOpen &&
      settings.markerDialogPresentation === "infobox";
    if (
      editor.isPreview &&
      settings.previewShowLabelOnSelect &&
      previewActiveId != null &&
      !ui.previewLabelPending &&
      !hoveringOther &&
      !infoBoxOpen &&
      camera.camera
    ) {
      const active = findHotspot(previewActiveId);
      const visual = visuals.get(previewActiveId);
      if (active && visual && isPreviewHotspotEnabled(editor.isPreview, active.id)) {
        const world = visual.root.getPosition();
        toHotspot.sub2(world, camPos);
        if (toHotspot.dot(camera.forward) > 0) {
          camera.camera.worldToScreen(world, screenPos);
          const resolved = resolveHotspotAppearance(active, true);
          const prevTip = ui.hoverTooltip;
          if (
            !prevTip ||
            prevTip.pinned !== true ||
            prevTip.title !== resolved.title ||
            Math.abs(prevTip.x - screenPos.x) > SCREEN_EPS ||
            Math.abs(prevTip.y - screenPos.y) > SCREEN_EPS
          ) {
            useUIStore.getState().setHoverTooltip({
              x: screenPos.x,
              y: screenPos.y,
              title: resolved.title,
              pinned: true,
            });
          }
        }
      }
    }

    // Keep the info box anchored to the active hotspot's screen position.
    if (editor.isPreview && infoBoxOpen && previewActiveId != null && camera.camera) {
      const visual = visuals.get(previewActiveId);
      if (visual) {
        const world = visual.root.getPosition();
        toHotspot.sub2(world, camPos);
        const inFront = toHotspot.dot(camera.forward) > 0;
        if (inFront) {
          camera.camera.worldToScreen(world, screenPos);
          const prev = ui.infoBoxAnchor;
          if (
            !prev ||
            !prev.visible ||
            Math.abs(prev.x - screenPos.x) > 0.5 ||
            Math.abs(prev.y - screenPos.y) > 0.5
          ) {
            useUIStore.getState().setInfoBoxAnchor({
              x: screenPos.x,
              y: screenPos.y,
              visible: true,
            });
          }
        } else if (ui.infoBoxAnchor?.visible !== false) {
          useUIStore.getState().setInfoBoxAnchor(
            ui.infoBoxAnchor
              ? { ...ui.infoBoxAnchor, visible: false }
              : { x: 0, y: 0, visible: false },
          );
        }
      }
    } else if (ui.infoBoxAnchor != null) {
      useUIStore.getState().setInfoBoxAnchor(null);
    }
  };

  const setWorldPosition = (id: number, position: Vec3) => {
    const visual = visuals.get(id);
    if (!visual) return;
    visual.root.setPosition(position.x, position.y, position.z);
  };

  const commitWorldPosition = (id: number) => {
    const visual = visuals.get(id);
    if (!visual) return;
    const live = visual.root.getPosition();
    const current = findHotspot(id);
    if (
      current &&
      current.position.x === live.x &&
      current.position.y === live.y &&
      current.position.z === live.z
    ) {
      return;
    }
    useEditorStore.getState().updateHotspot(id, {
      position: { x: live.x, y: live.y, z: live.z },
    });
  };

  syncFromStore();

  return {
    syncFromStore,
    update,
    getVisual: (id) => visuals.get(id),
    setWorldPosition,
    commitWorldPosition,
    dispose: () => {
      for (const visual of visuals.values()) destroyHotspotVisual(visual);
      visuals.clear();
    },
  };
}
