"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useState } from "react";
import { PreviewModal } from "@/app/editor/_components/dialogs/preview-modal";
import { LegendDrawer } from "@/app/editor/_components/drawers/legend-drawer";
import { SceneExplorerDrawer } from "@/app/editor/_components/drawers/scene-explorer-drawer";
import { LoadingOverlay } from "@/app/editor/_components/loading-overlay";
import { EditorToaster } from "@/app/editor/_components/ui/editor-toaster";
import { PreviewEdgeColumn } from "@/app/editor/_components/viewport/preview-edge-column";
import { SceneTransitionOverlay } from "@/app/editor/_components/viewport/scene-transition-overlay";
import { ViewerViewport } from "@/app/view/_components/viewer-viewport";
import { whenViewportReady } from "@/lib/editor/engine/viewport-ready";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useGeneralSettingsStore } from "@/lib/editor/state/general-settings-store";
import { generalStyleToCssVars } from "@/lib/editor/theme/preview-style-vars";
import { enterViewerPreview } from "@/lib/viewer/boot";

/**
 * Viewer chrome: the editor's Preview surfaces only (viewport, menu bar,
 * legend, scene explorer, dialog slot, transitions, toasts). It reuses the
 * editor's `[data-preview="true"]` styles, so it looks exactly like Preview.
 */
export function ViewerShell() {
  const isPreview = useEditorStore((s) => s.isPreview);
  const generalStyle = useGeneralSettingsStore((s) => s.style);

  // Enter Preview once the viewport listens for focus / scene events, so App
  // Start actions (fly to hotspot, open dialog) are not lost.
  useEffect(() => whenViewportReady(enterViewerPreview), []);

  return (
    <div
      className="editor-root outliner-collapsed relative flex h-dvh w-full flex-col dark"
      data-preview="true"
      data-preview-borders={generalStyle.bordersEnabled ? "on" : "off"}
      style={generalStyleToCssVars(generalStyle)}
    >
      <LoadingOverlay />
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <ViewerViewport />
        {isPreview ? (
          <>
            <LegendDrawer />
            <SceneExplorerDrawer />
            <PreviewEdgeColumn side="left" />
            <PreviewEdgeColumn side="right" />
            <PreviewModal />
          </>
        ) : null}
        <FullscreenButton />
      </div>
      <SceneTransitionOverlay />
      <EditorToaster />
    </div>
  );
}

/** Shown only when embedded in an iframe, where the page cannot be maximised otherwise. */
function FullscreenButton() {
  // The viewer is client-only (`ssr: false`), so the browser can be read here.
  const [embedded] = useState(() => {
    let framed = true;
    try {
      framed = window.self !== window.top;
    } catch {
      /* cross-origin parent: framed */
    }
    // Hide when the host did not grant `allow="fullscreen"`.
    return framed && document.fullscreenEnabled;
  });
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement != null);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  if (!embedded) return null;
  const Icon = fullscreen ? Minimize2 : Maximize2;
  return (
    <button
      type="button"
      title={fullscreen ? "Exit full screen" : "Full screen"}
      aria-label={fullscreen ? "Exit full screen" : "Full screen"}
      className="editor-tool-btn editor-glass absolute right-3 top-3 z-20 rounded-lg"
      onClick={() => {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen();
      }}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
