"use client";

import { useEffect, useRef } from "react";
import type { Map as MapLibreMap, MapMouseEvent } from "maplibre-gl";
import { toast } from "sonner";
import { runHotspotActions } from "@/lib/editor/actions/run-hotspot-actions";
import { captureViewportPreview } from "@/lib/editor/engine/capture-viewport-preview";
import {
  poseFromGeoViewport,
  resolveGeoHomeViewport,
  type GeoMapViewport,
} from "@/lib/editor/geo/resolve-home-viewport";
import { isMapViewportPose } from "@/lib/editor/constants/default-settings";
import { overlayHitLayerId, layerIdFromHitLayer } from "@/lib/editor/layers/overlay-ids";
import {
  clearEditorSelection,
  selectHotspotExclusive,
  selectLayerExclusive,
} from "@/lib/editor/state/exclusive-selection";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useGeoStore } from "@/lib/editor/state/geo-store";
import { useLayersStore } from "@/lib/editor/state/layers-store";
import { useMapViewportStore } from "@/lib/editor/state/map-viewport-store";
import {
  syncActiveSceneSettings,
  useScenesStore,
} from "@/lib/editor/state/scenes-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import { useUIStore } from "@/lib/editor/state/ui-store";
import {
  isPreviewHotspotEnabled,
  usePreviewVisibilityStore,
} from "@/lib/editor/state/preview-visibility-store";
import { usePreviewAppearanceStore } from "@/lib/editor/state/preview-appearance-store";
import { LEGEND_CATEGORY_ALL } from "@/lib/editor/types/legend-category";
import { isGeoOverlay } from "@/lib/editor/types/scene-layer";

function currentViewport(map: MapLibreMap): GeoMapViewport {
  const center = map.getCenter();
  return {
    center: [center.lng, center.lat],
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
  };
}

function projectHotspot(
  map: MapLibreMap,
  lng: number,
  lat: number,
): { x: number; y: number } | null {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  try {
    const point = map.project({ lng, lat });
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
    return { x: point.x, y: point.y };
  } catch {
    return null;
  }
}

function syncOverlayAnchors(map: MapLibreMap) {
  const editor = useEditorStore.getState();
  const ui = useUIStore.getState();
  const settings = useSettingsStore.getState();
  const previewActiveId = ui.previewActiveHotspotId;
  const infoBoxOpen =
    ui.previewModalOpen && settings.markerDialogPresentation === "infobox";

  if (editor.isPreview && infoBoxOpen && previewActiveId != null) {
    const hotspot = editor.hotspots.find((h) => h.id === previewActiveId);
    if (hotspot && isPreviewHotspotEnabled(editor.isPreview, hotspot.id)) {
      const point = projectHotspot(map, hotspot.position.x, hotspot.position.y);
      if (point) {
        const prev = ui.infoBoxAnchor;
        if (
          !prev ||
          !prev.visible ||
          Math.abs(prev.x - point.x) > 0.5 ||
          Math.abs(prev.y - point.y) > 0.5
        ) {
          ui.setInfoBoxAnchor({ x: point.x, y: point.y, visible: true });
        }
      }
    }
  } else if (ui.infoBoxAnchor != null && !infoBoxOpen) {
    ui.setInfoBoxAnchor(null);
  }

  const hoveringOther =
    editor.hoveredId != null && editor.hoveredId !== previewActiveId;
  if (
    editor.isPreview &&
    settings.previewShowLabelOnSelect &&
    previewActiveId != null &&
    !ui.previewLabelPending &&
    !hoveringOther &&
    !infoBoxOpen
  ) {
    const active = editor.hotspots.find((h) => h.id === previewActiveId);
    if (active && isPreviewHotspotEnabled(editor.isPreview, active.id)) {
      const point = projectHotspot(map, active.position.x, active.position.y);
      if (point) {
        ui.setHoverTooltip({
          x: point.x,
          y: point.y,
          title: active.title,
          pinned: true,
        });
      }
    } else if (ui.hoverTooltip) {
      ui.setHoverTooltip(null);
    }
  }
}

export function useGeoMapEditor(map: MapLibreMap | null, isLoaded: boolean) {
  const skipStartFly = useRef(true);
  const minZoom = useSettingsStore((s) => s.minZoom);
  const maxZoom = useSettingsStore((s) => s.maxZoom);
  const startLng = useGeoStore((s) => s.start?.lng ?? null);
  const startLat = useGeoStore((s) => s.start?.lat ?? null);
  const startZoom = useGeoStore((s) => s.startZoom);

  useEffect(() => {
    useMapViewportStore
      .getState()
      .setViewport(
        resolveGeoHomeViewport(
          useSettingsStore.getState().resetPosition,
          useGeoStore.getState(),
        ),
      );
    useUIStore.getState().setLoading(false);
  }, []);

  useEffect(() => {
    if (!map || !isLoaded) return;
    map.setMinZoom(minZoom);
    map.setMaxZoom(maxZoom);
  }, [map, isLoaded, minZoom, maxZoom]);

  useEffect(() => {
    if (!map || !isLoaded) return;
    if (skipStartFly.current) {
      skipStartFly.current = false;
      return;
    }
    const home = resolveGeoHomeViewport(null, useGeoStore.getState());
    map.flyTo({
      center: home.center,
      zoom: home.zoom,
      bearing: home.bearing,
      pitch: home.pitch,
      essential: true,
      duration: 1100,
    });
  }, [map, isLoaded, startLng, startLat, startZoom]);

  useEffect(() => {
    if (!map || !isLoaded) return;

    const onClick = (event: MapMouseEvent) => {
      const target = event.originalEvent.target;
      if (
        target instanceof Element &&
        (target.closest(".maplibregl-marker") ||
          target.closest(".editor-overlay-gizmo"))
      ) {
        return;
      }

      const editor = useEditorStore.getState();
      if (editor.isPreview) return;

      if (editor.mode === "add") {
        const created = editor.addHotspot({
          x: event.lngLat.lng,
          y: event.lngLat.lat,
          z: 0,
        });
        selectHotspotExclusive(created.id);
        useUIStore.getState().setPropertiesDrawerOpen(true);
        editor.setMode("select");
        toast.success("Hotspot added — drag to reposition");
        return;
      }

      if (editor.mode === "select") {
        const hitLayerIds = useLayersStore
          .getState()
          .layers.filter(isGeoOverlay)
          .filter((layer) => layer.visible)
          .map((layer) => overlayHitLayerId(layer.id))
          .filter((id) => map.getLayer(id));
        if (hitLayerIds.length > 0) {
          const hits = map.queryRenderedFeatures(event.point, {
            layers: hitLayerIds,
          });
          const hitId = hits[0] ? layerIdFromHitLayer(hits[0].layer.id) : null;
          if (hitId) {
            selectLayerExclusive(hitId);
            useUIStore.getState().setOutlinerTab("layers");
            useUIStore.getState().setPropertiesDrawerOpen(false);
            return;
          }
        }
        clearEditorSelection();
        useUIStore.getState().setPropertiesDrawerOpen(false);
      }
    };

    const onMove = () => {
      useMapViewportStore.getState().setViewport(currentViewport(map));
      syncOverlayAnchors(map);
    };

    map.on("click", onClick);
    map.on("move", onMove);
    onMove();

    const onResetCamera = () => {
      const home = resolveGeoHomeViewport(
        useSettingsStore.getState().resetPosition,
        useGeoStore.getState(),
      );
      map.flyTo({
        center: home.center,
        zoom: home.zoom,
        bearing: home.bearing,
        pitch: home.pitch,
        essential: true,
        duration: 900,
      });
    };

    const onZoom = (event: Event) => {
      const delta =
        (event as CustomEvent<{ delta: number }>).detail?.delta ?? 0;
      if (delta < 0) map.zoomIn({ duration: 220 });
      else map.zoomOut({ duration: 220 });
    };

    const capturePose = () => {
      const viewport = currentViewport(map);
      const previewUrl = captureViewportPreview(map.getCanvas());
      return poseFromGeoViewport(viewport, previewUrl);
    };

    const onSetResetPosition = () => {
      useSettingsStore.getState().setSettings({
        resetPosition: capturePose(),
      });
      syncActiveSceneSettings();
      toast.success("Reset view position saved");
    };

    const onSetHotspotCamera = (event: Event) => {
      const id = (event as CustomEvent<{ id: number }>).detail?.id;
      if (id == null) return;
      const hotspot = useEditorStore
        .getState()
        .hotspots.find((h) => h.id === id);
      if (!hotspot) return;
      useEditorStore.getState().updateHotspot(id, {
        customCamera: capturePose(),
        customCameraEnabled: true,
      });
      toast.success("Hotspot camera saved");
    };

    const onFocusHotspot = (event: Event) => {
      const id = (event as CustomEvent<{ id: number }>).detail?.id;
      if (id == null) return;
      const hotspot = useEditorStore
        .getState()
        .hotspots.find((h) => h.id === id);
      if (!hotspot) return;

      if (
        hotspot.customCameraEnabled &&
        isMapViewportPose(hotspot.customCamera)
      ) {
        map.flyTo({
          center: [hotspot.customCamera.lng, hotspot.customCamera.lat],
          zoom: hotspot.customCamera.zoom,
          bearing: hotspot.customCamera.bearing ?? 0,
          pitch: Number.isFinite(hotspot.customCamera.pitch)
            ? hotspot.customCamera.pitch
            : 0,
          essential: true,
          duration: 900,
        });
        return;
      }

      const lng = hotspot.position.x;
      const lat = hotspot.position.y;
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

      map.flyTo({
        center: [lng, lat],
        zoom: Math.max(map.getZoom(), 6),
        essential: true,
        duration: 800,
      });
    };

    const onSceneSwitched = () => {
      const scene = useScenesStore
        .getState()
        .scenes.find((s) => s.id === useScenesStore.getState().activeSceneId);
      if (!scene || scene.type !== "geo") return;
      const home = resolveGeoHomeViewport(
        useSettingsStore.getState().resetPosition,
        useGeoStore.getState(),
      );
      map.jumpTo({
        center: home.center,
        zoom: home.zoom,
        bearing: home.bearing,
        pitch: home.pitch,
      });
      skipStartFly.current = true;
    };

    window.addEventListener("editor:reset-camera", onResetCamera);
    window.addEventListener("editor:zoom", onZoom);
    window.addEventListener("editor:set-reset-position", onSetResetPosition);
    window.addEventListener("editor:set-hotspot-camera", onSetHotspotCamera);
    window.addEventListener("editor:focus-hotspot", onFocusHotspot);
    window.addEventListener("editor:scene-switched", onSceneSwitched);

    const unsubEditor = useEditorStore.subscribe(() => syncOverlayAnchors(map));
    const unsubUi = useUIStore.subscribe(() => syncOverlayAnchors(map));
    const unsubPreview = usePreviewVisibilityStore.subscribe(() =>
      syncOverlayAnchors(map),
    );
    const unsubAppearance = usePreviewAppearanceStore.subscribe(() =>
      syncOverlayAnchors(map),
    );

    return () => {
      map.off("click", onClick);
      map.off("move", onMove);
      window.removeEventListener("editor:reset-camera", onResetCamera);
      window.removeEventListener("editor:zoom", onZoom);
      window.removeEventListener(
        "editor:set-reset-position",
        onSetResetPosition,
      );
      window.removeEventListener(
        "editor:set-hotspot-camera",
        onSetHotspotCamera,
      );
      window.removeEventListener("editor:focus-hotspot", onFocusHotspot);
      window.removeEventListener("editor:scene-switched", onSceneSwitched);
      unsubEditor();
      unsubUi();
      unsubPreview();
      unsubAppearance();
    };
  }, [map, isLoaded]);
}

export function handleGeoMarkerClick(id: number) {
  const editor = useEditorStore.getState();
  const hotspot = editor.hotspots.find((h) => h.id === id);
  if (!hotspot || !isPreviewHotspotEnabled(editor.isPreview, id)) return;
  if (editor.isPreview) {
    void runHotspotActions(id);
    return;
  }
  editor.selectHotspot(id);
  useLayersStore.getState().setSelectedId(null);
  useUIStore.getState().setPropertiesDrawerOpen(true);
}

export function handleGeoMarkerEnter(id: number, clientX: number, clientY: number) {
  const editor = useEditorStore.getState();
  editor.setHoveredHotspot(id);
  if (!editor.isPreview) return;
  const ui = useUIStore.getState();
  const wrap = document.getElementById("editor-viewport-wrap");
  const rect = wrap?.getBoundingClientRect();
  const hotspot = editor.hotspots.find((h) => h.id === id);
  if (!hotspot || !rect) return;
  if (id === ui.previewActiveHotspotId) return;
  ui.setHoverTooltip({
    x: clientX - rect.left,
    y: clientY - rect.top,
    title: hotspot.title,
    pinned: false,
  });
}

export function handleGeoMarkerLeave(id: number) {
  const editor = useEditorStore.getState();
  if (editor.hoveredId === id) editor.setHoveredHotspot(null);
  const ui = useUIStore.getState();
  const settings = useSettingsStore.getState();
  const keepSelectLabel =
    settings.previewShowLabelOnSelect &&
    ui.previewActiveHotspotId != null &&
    !ui.previewLabelPending;
  if (!keepSelectLabel) ui.setHoverTooltip(null);
}

export function visibleGeoHotspots() {
  const editor = useEditorStore.getState();
  const ui = useUIStore.getState();
  const legendFilter = ui.legendFilterCategory;
  const filterByLegend =
    editor.isPreview && legendFilter !== LEGEND_CATEGORY_ALL;
  return editor.hotspots.filter(
    (hotspot) =>
      isPreviewHotspotEnabled(editor.isPreview, hotspot.id) &&
      (!filterByLegend || hotspot.category === legendFilter),
  );
}
