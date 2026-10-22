import type { Application, Entity } from "playcanvas";
import type * as pc from "playcanvas";
import {
  createHotspotVisual,
  destroyHotspotVisual,
  rebuildCore,
  visualStyleKey,
  type HotspotVisual,
} from "@/lib/editor/engine/hotspot-visuals";
import { getModelMeshCenter } from "@/lib/editor/engine/model-mesh-queries";
import { requestViewportRender } from "@/lib/editor/engine/viewport-invalidate";
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
  isMeshBoundHotspot,
  normalizeHotspotShape,
  type Vec3,
} from "@/lib/editor/types/hotspot";
import { LEGEND_CATEGORY_ALL } from "@/lib/editor/types/legend-category";

export type HotspotManager = {
  syncFromStore: () => void;
  /** Returns true while a pulse ring or selection halo is animating. */
  update: (dt: number) => boolean;
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
  const SCREEN_EPS = 0.5;
  /** Relative change below which a marker's zoom scale is left alone. */
  const SCALE_EPS = 1e-4;

  // Billboards: camera rotation × (-90° X) so the +Y plane faces the camera.
  // Recomputed only when the camera turns; entities re-orient once per turn.
  const planeToCamera = new pcModule.Quat().setFromEulerAngles(-90, 0, 0);
  const billboardRot = new pcModule.Quat();
  const lastCamRot = new pcModule.Quat(NaN, NaN, NaN, NaN);
  let billboardVersion = 0;
  const billboardApplied = new WeakMap<Entity, number>();

  const faceCamera = (entity: Entity) => {
    if (billboardApplied.get(entity) === billboardVersion) return;
    entity.setRotation(billboardRot);
    billboardApplied.set(entity, billboardVersion);
  };

  /**
   * Animated fades write a per-instance uniform. Changing `material.opacity`
   * needs `material.update()`, which rebuilds every uniform of the material.
   */
  const setFadeOpacity = (entity: Entity, opacity: number) => {
    entity.render?.meshInstances[0]?.setParameter("material_opacity", opacity);
  };

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
      // Mesh-click hotspots follow their mesh in `update` instead.
      if (draggingId !== hotspot.id && !isMeshBoundHotspot(hotspot)) {
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
        void rebuildCore(app, pcModule, existing, resolved).finally(() =>
          requestViewportRender(),
        );
      } else {
        const hidden = isHiddenHotspotStyle(resolved.style);
        existing.ring.enabled = !!resolved.pulse && !hidden;
      }
    }
  };

  const update = (dt: number): boolean => {
    let animating = false;
    elapsed += dt;
    const t = elapsed;
    const settings = useSettingsStore.getState();
    const editor = useEditorStore.getState();
    const ui = useUIStore.getState();
    const camPos = camera.getPosition();
    const camRot = camera.getRotation();
    if (!camRot.equals(lastCamRot)) {
      lastCamRot.copy(camRot);
      billboardRot.mul2(camRot, planeToCamera);
      billboardVersion += 1;
    }
    const refDist = settings.hotspotRefDist;
    const previewActiveId = ui.previewActiveHotspotId;
    const showAllLabels = editor.isPreview && ui.previewShowAllLabels;
    const infoBoxOpen =
      ui.previewModalOpen &&
      settings.markerDialogPresentation === "infobox";
    const labelAnchors: { id: number; x: number; y: number; title: string }[] =
      [];

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

      // Mesh-click hotspot: no marker. The hidden visual sits at the live mesh
      // centre so the info box anchor, select label and labels still have a point.
      if (isMeshBoundHotspot(hotspot)) {
        if (visual.root.enabled) visual.root.enabled = false;
        const center = getModelMeshCenter(hotspot.meshId!);
        const target = center ?? hotspot.position;
        const live = visual.root.getPosition();
        if (live.x !== target.x || live.y !== target.y || live.z !== target.z) {
          visual.root.setPosition(target.x, target.y, target.z);
        }
        const clickable =
          center != null &&
          categoryVisible &&
          isPreviewHotspotEnabled(editor.isPreview, hotspot.id);
        if (
          clickable &&
          showAllLabels &&
          camera.camera &&
          !(infoBoxOpen && hotspot.id === previewActiveId)
        ) {
          const pos = visual.root.getPosition();
          toHotspot.sub2(pos, camPos);
          if (toHotspot.dot(camera.forward) > 0) {
            camera.camera.worldToScreen(pos, screenPos);
            labelAnchors.push({
              id: hotspot.id,
              x: screenPos.x,
              y: screenPos.y,
              title: resolved.title,
            });
          }
        }
        index += 1;
        continue;
      }
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
      // Setting scale dirties the marker's transforms; skip when unchanged.
      if (Math.abs(visual.root.getLocalScale().x - scale) > scale * SCALE_EPS) {
        visual.root.setLocalScale(scale, scale, scale);
      }

      const isPreviewActive =
        editor.isPreview && hotspot.id === previewActiveId;
      // The halo is only drawn while it is visible (selected / open).
      const haloActive = hotspot.id === editor.selectedId || isPreviewActive;
      if (visual.halo.enabled !== haloActive) visual.halo.enabled = haloActive;
      if (haloActive) {
        animating = true;
        setFadeOpacity(visual.halo, 0.15 + Math.sin(t * 4) * 0.08);
      }

      if (visual.ring.enabled) {
        animating = true;
        // Expanding fade ring: grows out while opacity eases to 0, then loops
        const cycle = ((t * 0.55 + index * 0.37) % 1 + 1) % 1;
        const ease = 1 - Math.pow(1 - cycle, 2.2);
        const ringScale = 0.38 + ease * 1.15;
        const pinBoost =
          normalizeHotspotShape(resolved.shape) === "pin"
            ? PIN_SPRITE_SCALE
            : 1;
        visual.ring.setLocalScale(ringScale * pinBoost, 1, ringScale * pinBoost);
        setFadeOpacity(visual.ring, (1 - ease) * 0.78);
        faceCamera(visual.ring);
      }

      if (visual.coreTexture && visual.core) {
        faceCamera(visual.core);
      }

      if (
        showAllLabels &&
        camera.camera &&
        !(infoBoxOpen && hotspot.id === previewActiveId)
      ) {
        toHotspot.sub2(pos, camPos);
        if (toHotspot.dot(camera.forward) > 0) {
          camera.camera.worldToScreen(pos, screenPos);
          labelAnchors.push({
            id: hotspot.id,
            x: screenPos.x,
            y: screenPos.y,
            title: resolved.title,
          });
        }
      }

      index += 1;
    }

    if (showAllLabels) {
      useUIStore.getState().setLabelAnchors(labelAnchors);
    } else if (ui.labelAnchors.length > 0) {
      useUIStore.getState().setLabelAnchors([]);
    }

    // Pin title label to the selected preview hotspot after the click reveal delay.
    // Skip while hovering a *different* hotspot (that uses the mouse-follow label).
    // Skip when the info box is open — it occupies the same screen space.
    const hoveringOther =
      editor.hoveredId != null && editor.hoveredId !== previewActiveId;
    if (
      editor.isPreview &&
      !showAllLabels &&
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
    return animating;
  };

  const setWorldPosition = (id: number, position: Vec3) => {
    const visual = visuals.get(id);
    if (!visual) return;
    visual.root.setPosition(position.x, position.y, position.z);
    requestViewportRender();
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
