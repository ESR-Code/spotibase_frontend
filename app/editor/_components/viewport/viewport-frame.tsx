"use client";

import dynamic from "next/dynamic";
import { PlayCanvasViewport } from "@/app/editor/_components/viewport/playcanvas-viewport";
import { EngineErrorBanner } from "@/app/editor/_components/viewport/engine-error-banner";
import { ModelDropOverlay } from "@/app/editor/_components/viewport/model-drop-overlay";
import { ViewportControls } from "@/app/editor/_components/viewport/viewport-controls";
import { ViewportHud } from "@/app/editor/_components/viewport/viewport-hud";
import { ViewportLogo } from "@/app/editor/_components/viewport/viewport-logo";
import { HotspotHoverTooltip } from "@/app/editor/_components/viewport/hotspot-hover-tooltip";
import { AlignmentMarkersOverlay } from "@/app/editor/_components/viewport/alignment-markers-overlay";
import { AlignmentPickBanner } from "@/app/editor/_components/viewport/alignment-pick-banner";
import { useAlignmentSessionStore } from "@/lib/editor/state/alignment-session-store";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useModelStore } from "@/lib/editor/state/model-store";
import { useActiveScene } from "@/lib/editor/state/scenes-store";
import { isGeoSceneType } from "@/lib/editor/scene-types/registry";

const GeoMapViewport = dynamic(
  () =>
    import("@/app/editor/_components/viewport/geo-map-viewport").then(
      (mod) => mod.GeoMapViewport,
    ),
  { ssr: false },
);

export function ViewportFrame() {
  const scene = useActiveScene();
  const isGeo = isGeoSceneType(scene.type);
  const mode = useEditorStore((s) => s.mode);
  const engineError = useModelStore((s) => s.engineError);
  const waitingLocal = useAlignmentSessionStore(
    (s) => s.open && s.phase === "align" && s.waitingFor === "local",
  );

  return (
    <div
      id="editor-viewport-wrap"
      className={`relative min-h-0 min-w-0 flex-1 editor-bp-grid ${mode === "add" || waitingLocal ? "crosshair" : ""}`}
    >
      {isGeo ? <GeoMapViewport /> : <PlayCanvasViewport />}
      {engineError && !isGeo ? <EngineErrorBanner message={engineError} /> : null}
      <HotspotHoverTooltip />
      {!isGeo ? <AlignmentMarkersOverlay /> : null}
      <AlignmentPickBanner />
      {isGeo ? null : <ModelDropOverlay />}
      <ViewportLogo />
      <ViewportHud />
      <ViewportControls />
    </div>
  );
}
