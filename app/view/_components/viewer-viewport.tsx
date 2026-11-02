"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { EngineErrorBanner } from "@/app/editor/_components/viewport/engine-error-banner";
import {
  HotspotHoverTooltip,
  HotspotLabelOverlay,
} from "@/app/editor/_components/viewport/hotspot-hover-tooltip";
import { ViewportControls } from "@/app/editor/_components/viewport/viewport-controls";
import { ViewportLogo } from "@/app/editor/_components/viewport/viewport-logo";
import { isGeoSceneType } from "@/lib/editor/scene-types/registry";
import { useModelStore } from "@/lib/editor/state/model-store";
import { useActiveScene } from "@/lib/editor/state/scenes-store";

// Engines load on demand: a geo-only tour never downloads PlayCanvas, and a
// tour without geo scenes never downloads MapLibre.
const PlayCanvasViewport = dynamic(
  () =>
    import("@/app/editor/_components/viewport/playcanvas-viewport").then(
      (mod) => mod.PlayCanvasViewport,
    ),
  { ssr: false },
);

const GeoMapViewport = dynamic(
  () =>
    import("@/app/editor/_components/viewport/geo-map-viewport").then(
      (mod) => mod.GeoMapViewport,
    ),
  { ssr: false },
);

/**
 * The editor's `ViewportFrame` without authoring overlays (alignment, model
 * drop, HUD, Post Message tester). Same slot layout, so Preview CSS applies.
 */
export function ViewerViewport() {
  const scene = useActiveScene();
  const isGeo = isGeoSceneType(scene.type);
  const engineError = useModelStore((s) => s.engineError);
  // Once a 2D / 3D scene has been shown, keep PlayCanvas mounted (hidden on
  // geo scenes) like the editor does, so switching back does not re-init.
  const [playCanvasNeeded, setPlayCanvasNeeded] = useState(!isGeo);
  if (!isGeo && !playCanvasNeeded) setPlayCanvasNeeded(true);

  return (
    <div id="editor-viewport-wrap" className="relative min-h-0 min-w-0 flex-1">
      {playCanvasNeeded ? (
        <div
          className="absolute inset-0 overflow-hidden"
          style={isGeo ? { visibility: "hidden", pointerEvents: "none" } : undefined}
          aria-hidden={isGeo}
        >
          <PlayCanvasViewport />
        </div>
      ) : null}
      {isGeo ? <GeoMapViewport /> : null}
      {engineError && !isGeo ? <EngineErrorBanner message={engineError} /> : null}
      <HotspotHoverTooltip />
      <HotspotLabelOverlay />
      <div className="editor-viewport-top-center">
        <ViewportLogo slot="center" />
        <ViewportControls slot="top" />
      </div>
      <ViewportLogo slot="right" />
      <div className="editor-viewport-hud-stack">
        <ViewportLogo slot="left" />
      </div>
      <ViewportControls slot="bottom" />
    </div>
  );
}
