"use client";

import { EditorHeader } from "@/app/editor/_components/editor-header";
import { LoadingOverlay } from "@/app/editor/_components/loading-overlay";
import { HotspotOutliner, OutlinerExpandTab } from "@/app/editor/_components/outliner/hotspot-outliner";
import { ViewportFrame } from "@/app/editor/_components/viewport/viewport-frame";
import { HotspotPropertiesDrawer } from "@/app/editor/_components/drawers/hotspot-properties-drawer";
import {
  LegendButton,
  LegendDrawer,
} from "@/app/editor/_components/drawers/legend-drawer";
import { GeneralSettingsDrawer } from "@/app/editor/_components/drawers/general-settings-drawer";
import { SettingsDrawer } from "@/app/editor/_components/drawers/settings-drawer";
import { ActionsModal } from "@/app/editor/_components/actions/actions-modal";
import { SpawnClickActionsModal } from "@/app/editor/_components/actions/spawn-click-actions-modal";
import { PreviewModal } from "@/app/editor/_components/dialogs/preview-modal";
import { ScenesModal } from "@/app/editor/_components/dialogs/scenes-modal";
import { GeoreferenceModal } from "@/app/editor/_components/dialogs/georeference-modal";
import { SceneTransitionOverlay } from "@/app/editor/_components/viewport/scene-transition-overlay";
import { useEditorKeyboard } from "@/lib/editor/hooks/use-editor-keyboard";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useGeneralSettingsStore } from "@/lib/editor/state/general-settings-store";
import { useUIStore } from "@/lib/editor/state/ui-store";
import { generalStyleToCssVars } from "@/lib/editor/theme/preview-style-vars";

export function EditorShell() {
  useEditorKeyboard();
  const outlinerCollapsed = useUIStore((s) => s.outlinerCollapsed);
  const isPreview = useEditorStore((s) => s.isPreview);
  const generalStyle = useGeneralSettingsStore((s) => s.style);

  return (
    <div
      className={`editor-root relative flex h-dvh w-full flex-col dark ${outlinerCollapsed ? "outliner-collapsed" : ""}`}
      data-preview={isPreview ? "true" : undefined}
      data-preview-borders={
        isPreview ? (generalStyle.bordersEnabled ? "on" : "off") : undefined
      }
      style={isPreview ? generalStyleToCssVars(generalStyle) : undefined}
    >
      <LoadingOverlay />
      <EditorHeader />

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <ViewportFrame />
        <HotspotOutliner />
        <OutlinerExpandTab />
        <HotspotPropertiesDrawer />
        <SettingsDrawer />
        <GeneralSettingsDrawer />
        <LegendDrawer />
        <LegendButton />
        <PreviewModal />
        <ScenesModal />
        <GeoreferenceModal />
        <ActionsModal />
        <SpawnClickActionsModal />
      </div>

      <SceneTransitionOverlay />
    </div>
  );
}
