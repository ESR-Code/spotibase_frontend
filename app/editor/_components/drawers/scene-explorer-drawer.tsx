"use client";

import { DrawerHeader } from "@/app/editor/_components/drawers/drawer-brand";
import { resolveAssetSrc } from "@/lib/editor/assets";
import { Layers, Map } from "lucide-react";
import { LegendButton } from "@/app/editor/_components/drawers/legend-drawer";
import { GlassPanel } from "@/app/editor/_components/ui/glass-panel";
import { transitionToScene } from "@/lib/editor/actions/transition-to-scene";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useGeneralSettingsStore } from "@/lib/editor/state/general-settings-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import { useUIStore } from "@/lib/editor/state/ui-store";
import type { Scene } from "@/lib/editor/types/scene";

/** Scene Explorer + Legend buttons; placed by `PreviewEdgeColumn`. */
export function PreviewRailButtons() {
  const isPreview = useEditorStore((s) => s.isPreview);
  const legendEnabled = useSettingsStore((s) => s.legendEnabled);
  const sceneExplorerEnabled = useGeneralSettingsStore(
    (s) => s.sceneExplorerEnabled,
  );

  if (!isPreview || (!legendEnabled && !sceneExplorerEnabled)) return null;

  return (
    <div className="editor-preview-rail-btns editor-viewport-controls editor-glass editor-panel-shadow flex flex-col items-center gap-1 rounded-xl p-1.5">
      <SceneExplorerButton />
      <LegendButton />
    </div>
  );
}

export function SceneExplorerButton() {
  const isPreview = useEditorStore((s) => s.isPreview);
  const enabled = useGeneralSettingsStore((s) => s.sceneExplorerEnabled);
  const open = useUIStore((s) => s.sceneExplorerDrawerOpen);
  const setOpen = useUIStore((s) => s.setSceneExplorerDrawerOpen);

  if (!isPreview || !enabled) return null;

  return (
    <button
      type="button"
      title="Scene explorer"
      className={`editor-tool-btn ${open ? "active" : ""}`}
      onClick={() => setOpen(!open)}
    >
      <Map className="h-3.5 w-3.5" />
    </button>
  );
}

export function SceneExplorerDrawer() {
  const isPreview = useEditorStore((s) => s.isPreview);
  const enabled = useGeneralSettingsStore((s) => s.sceneExplorerEnabled);
  const title =
    (useGeneralSettingsStore((s) => s.sceneExplorerTitle) ?? "").trim() ||
    "Scene explorer";
  const inset = useGeneralSettingsStore((s) => s.sceneExplorerInset);
  const railSide = useGeneralSettingsStore((s) => s.railSide);
  const logoUrl = useGeneralSettingsStore((s) => s.sceneExplorerLogoUrl) ?? "";
  const logoSize = useGeneralSettingsStore((s) => s.sceneExplorerLogoSize) ?? "small";
  const hideTitle =
    useGeneralSettingsStore((s) => s.sceneExplorerHideTitle) ?? false;
  const open = useUIStore((s) => s.sceneExplorerDrawerOpen);
  const setOpen = useUIStore((s) => s.setSceneExplorerDrawerOpen);
  const scenes = useScenesStore((s) => s.scenes);
  const activeSceneId = useScenesStore((s) => s.activeSceneId);

  const visible = isPreview && enabled && open;

  if (!isPreview || !enabled) return null;

  return (
    <GlassPanel
      className={`editor-scene-explorer-drawer editor-preview-surface editor-glass editor-panel-shadow flex flex-col ${inset ? "editor-drawer-inset" : ""} ${railSide === "right" ? "editor-drawer-right" : ""} ${visible ? "open" : ""}`}
      aria-hidden={!visible}
    >
      <DrawerHeader
        title={title}
        logoUrl={logoUrl}
        logoSize={logoSize}
        hideTitle={hideTitle}
        subtitle={`${scenes.length} scene${scenes.length === 1 ? "" : "s"}`}
        closeTitle="Close scene explorer"
        onClose={() => setOpen(false)}
      />

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
        {scenes.map((scene) => (
          <SceneExplorerListItem
            key={scene.id}
            scene={scene}
            selected={scene.id === activeSceneId}
            onSelect={() => {
              if (scene.id === activeSceneId) return;
              transitionToScene(scene.id);
            }}
          />
        ))}
      </div>
    </GlassPanel>
  );
}

function SceneExplorerListItem({
  scene,
  selected,
  onSelect,
}: {
  scene: Scene;
  selected: boolean;
  onSelect: () => void;
}) {
  const description = scene.description.trim();

  return (
    <div
      className={`editor-hot-item editor-scene-explorer-item ${selected ? "selected" : ""}`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSelect();
      }}
      role="button"
      tabIndex={0}
    >
      {scene.thumbnailUrl ? (
        <span className="editor-scene-item-icon editor-scene-explorer-thumb">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolveAssetSrc(scene.thumbnailUrl)}
            alt=""
            className="h-full w-full object-cover"
          />
        </span>
      ) : (
        <span
          className={`editor-scene-item-icon editor-scene-explorer-thumb editor-scene-explorer-thumb-fallback ${selected ? "selected" : ""}`}
        >
          <Layers className="h-7 w-7" />
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="truncate text-[12.5px] font-semibold leading-tight">
          {scene.name}
        </div>
        {description ? (
          <div
            className="line-clamp-2 text-[10.5px] font-medium leading-snug"
            style={{ color: "var(--editor-muted)" }}
          >
            {description}
          </div>
        ) : null}
      </div>
    </div>
  );
}
