"use client";

import { EditorHeader } from "@/app/editor/_components/editor-header";
import { LoadingOverlay } from "@/app/editor/_components/loading-overlay";
import { HotspotOutliner, OutlinerExpandTab } from "@/app/editor/_components/outliner/hotspot-outliner";
import { PlayCanvasViewport } from "@/app/editor/_components/viewport/playcanvas-viewport";
import { HotspotPropertiesDrawer } from "@/app/editor/_components/drawers/hotspot-properties-drawer";
import { SettingsDrawer } from "@/app/editor/_components/drawers/settings-drawer";
import { PreviewModal } from "@/app/editor/_components/dialogs/preview-modal";
import { useEditorKeyboard } from "@/lib/editor/hooks/use-editor-keyboard";
import { useUIStore } from "@/lib/editor/state/ui-store";

export function EditorShell() {
  useEditorKeyboard();
  const outlinerCollapsed = useUIStore((s) => s.outlinerCollapsed);

  return (
    <div
      className={`editor-root relative flex h-dvh w-full flex-col ${outlinerCollapsed ? "outliner-collapsed" : ""}`}
    >
      <LoadingOverlay />
      <EditorHeader />

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <HotspotOutliner />
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <OutlinerExpandTab />
          <PlayCanvasViewport />
          <HotspotPropertiesDrawer />
          <SettingsDrawer />
          <PreviewModal />
        </div>
      </div>
    </div>
  );
}
