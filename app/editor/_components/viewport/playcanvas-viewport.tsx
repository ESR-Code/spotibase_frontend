"use client";

import { usePlayCanvasEditor } from "@/lib/editor/hooks/use-playcanvas-editor";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useModelStore } from "@/lib/editor/state/model-store";
import { EngineErrorBanner } from "@/app/editor/_components/viewport/engine-error-banner";
import { ModelDropOverlay } from "@/app/editor/_components/viewport/model-drop-overlay";
import { ViewportControls } from "@/app/editor/_components/viewport/viewport-controls";
import { ViewportHud } from "@/app/editor/_components/viewport/viewport-hud";
import { ViewportLogo } from "@/app/editor/_components/viewport/viewport-logo";
import { HotspotHoverTooltip } from "@/app/editor/_components/viewport/hotspot-hover-tooltip";

export function PlayCanvasViewport() {
  const { canvasRef } = usePlayCanvasEditor();
  const mode = useEditorStore((s) => s.mode);
  const engineError = useModelStore((s) => s.engineError);

  return (
    <div
      id="editor-viewport-wrap"
      className={`relative min-h-0 min-w-0 flex-1 editor-bp-grid ${mode === "add" ? "crosshair" : ""}`}
    >
      <div className="absolute inset-0 overflow-hidden">
        <canvas ref={canvasRef} className="block h-full w-full" />
      </div>
      {engineError && <EngineErrorBanner message={engineError} />}
      <HotspotHoverTooltip />
      <ModelDropOverlay />
      <ViewportLogo />
      <ViewportHud />
      <ViewportControls />
    </div>
  );
}
