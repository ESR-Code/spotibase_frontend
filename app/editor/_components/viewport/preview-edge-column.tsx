"use client";

import { PreviewRailButtons } from "@/app/editor/_components/drawers/scene-explorer-drawer";
import { ViewportControls } from "@/app/editor/_components/viewport/viewport-controls";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useGeneralSettingsStore } from "@/lib/editor/state/general-settings-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import { useUIStore } from "@/lib/editor/state/ui-store";
import type { PreviewRailSide } from "@/lib/editor/types/editor-settings";

/** Distance from the viewport edge, clearing an open Legend / Scene Explorer drawer. */
function useEdgeOffset(side: PreviewRailSide): string {
  const railSide = useGeneralSettingsStore((s) => s.railSide);
  const outlinerCollapsed = useUIStore((s) => s.outlinerCollapsed);
  const legendOpen = useUIStore((s) => s.legendDrawerOpen);
  const explorerOpen = useUIStore((s) => s.sceneExplorerDrawerOpen);
  const legendInset = useSettingsStore((s) => s.legendInset);
  const sceneExplorerInset = useGeneralSettingsStore((s) => s.sceneExplorerInset);

  const drawerOpen = railSide === side && (legendOpen || explorerOpen);
  if (drawerOpen) {
    const inset =
      (explorerOpen && sceneExplorerInset) || (legendOpen && legendInset);
    return inset ? "calc(18rem + 12px + 1rem)" : "calc(18rem + 1rem)";
  }
  if (side === "left" && !outlinerCollapsed) return "calc(18rem + 1rem)";
  return "1rem";
}

/**
 * Preview-only column along the left or right viewport edge. Rows:
 * free space / vertical menu bar (centered) / rail buttons (bottom), so a
 * vertical bar and the rail on the same side can never overlap.
 */
export function PreviewEdgeColumn({ side }: { side: PreviewRailSide }) {
  const isPreview = useEditorStore((s) => s.isPreview);
  const menuBarPosition = useGeneralSettingsStore((s) => s.menuBarPosition);
  const railSide = useGeneralSettingsStore((s) => s.railSide);
  const offset = useEdgeOffset(side);

  if (!isPreview) return null;
  if (menuBarPosition !== side && railSide !== side) return null;

  return (
    <div
      className="editor-preview-edge"
      data-side={side}
      style={side === "left" ? { left: offset } : { right: offset }}
    >
      <div />
      <div className="editor-preview-edge-middle">
        {menuBarPosition === side ? <ViewportControls slot={side} /> : null}
      </div>
      <div className="editor-preview-edge-bottom">
        {railSide === side ? <PreviewRailButtons /> : null}
      </div>
    </div>
  );
}
