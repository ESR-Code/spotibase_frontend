"use client";

import { Layers, Map, X } from "lucide-react";
import { LegendButton } from "@/app/editor/_components/drawers/legend-drawer";
import { GlassPanel } from "@/app/editor/_components/ui/glass-panel";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import { transitionToScene } from "@/lib/editor/actions/transition-to-scene";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useGeneralSettingsStore } from "@/lib/editor/state/general-settings-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import { useUIStore } from "@/lib/editor/state/ui-store";
import type { Scene } from "@/lib/editor/types/scene";

export function PreviewRailButtons() {
  const isPreview = useEditorStore((s) => s.isPreview);
  const legendEnabled = useSettingsStore((s) => s.legendEnabled);
  const sceneExplorerEnabled = useGeneralSettingsStore(
    (s) => s.sceneExplorerEnabled,
  );
  const outlinerCollapsed = useUIStore((s) => s.outlinerCollapsed);
  const legendOpen = useUIStore((s) => s.legendDrawerOpen);
  const explorerOpen = useUIStore((s) => s.sceneExplorerDrawerOpen);

  if (!isPreview || (!legendEnabled && !sceneExplorerEnabled)) return null;

  const railOpen = legendOpen || explorerOpen;
  const left =
    outlinerCollapsed && !railOpen ? "1rem" : "calc(18rem + 1rem)";

  return (
    <div
      className="editor-preview-rail-btns editor-viewport-controls editor-glass editor-panel-shadow absolute bottom-4 z-10 flex flex-col items-center gap-1 rounded-xl px-2 py-2"
      style={{ left }}
    >
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
  const open = useUIStore((s) => s.sceneExplorerDrawerOpen);
  const setOpen = useUIStore((s) => s.setSceneExplorerDrawerOpen);
  const scenes = useScenesStore((s) => s.scenes);
  const activeSceneId = useScenesStore((s) => s.activeSceneId);

  const visible = isPreview && enabled && open;

  if (!isPreview || !enabled) return null;

  return (
    <GlassPanel
      className={`editor-scene-explorer-drawer editor-glass editor-panel-shadow flex flex-col ${visible ? "open" : ""}`}
      aria-hidden={!visible}
    >
      <div
        className="flex flex-shrink-0 items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--editor-line-soft)" }}
      >
        <div>
          <div className="font-display text-[14px] font-bold">
            Scene explorer
          </div>
          <div className="text-[11px]" style={{ color: "var(--editor-muted)" }}>
            {scenes.length} scene{scenes.length === 1 ? "" : "s"}
          </div>
        </div>
        <IconButton title="Close scene explorer" onClick={() => setOpen(false)}>
          <X />
        </IconButton>
      </div>

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
            src={scene.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        </span>
      ) : (
        <span
          className="editor-scene-item-icon editor-scene-explorer-thumb"
          style={{
            color: selected ? "var(--editor-crimson-2)" : "var(--editor-amber)",
          }}
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
