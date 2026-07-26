"use client";

import {
  Box,
  ChevronLeft,
  ChevronRight,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import { SceneModelRow } from "@/app/editor/_components/outliner/scene-model-row";
import { HotspotListItem } from "@/app/editor/_components/outliner/hotspot-list-item";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useUIStore } from "@/lib/editor/state/ui-store";

export function HotspotOutliner() {
  const hotspots = useEditorStore((s) => s.hotspots);
  const selectedId = useEditorStore((s) => s.selectedId);
  const selectHotspot = useEditorStore((s) => s.selectHotspot);
  const removeHotspot = useEditorStore((s) => s.removeHotspot);
  const collapsed = useUIStore((s) => s.outlinerCollapsed);
  const setCollapsed = useUIStore((s) => s.setOutlinerCollapsed);
  const setPropertiesDrawerOpen = useUIStore((s) => s.setPropertiesDrawerOpen);

  const handleSelect = (id: number) => {
    selectHotspot(id);
    setPropertiesDrawerOpen(true);
  };

  const handleDelete = (id: number) => {
    removeHotspot(id);
    if (selectedId === id) setPropertiesDrawerOpen(false);
    toast.success("Hotspot deleted");
  };

  return (
    <aside
      className={`editor-outliner editor-glass z-10 ${collapsed ? "collapsed" : ""}`}
      style={{ borderRight: "1px solid var(--editor-line)" }}
    >
      <div className="editor-outliner-panel">
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid var(--editor-line-soft)" }}
        >
          <div>
            <div className="font-display text-[14px] font-bold">
              Hotspot Outliner
            </div>
            <div className="text-[11px]" style={{ color: "var(--editor-muted)" }}>
              {hotspots.length} markers in scene
            </div>
          </div>
          <IconButton
            title="Collapse outliner"
            onClick={() => setCollapsed(true)}
          >
            <ChevronLeft />
          </IconButton>
        </div>

        <div
          className="flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-wider"
          style={{
            color: "var(--editor-muted-2)",
            background: "rgba(11,20,36,0.4)",
          }}
        >
          <Box className="h-2.5 w-2.5" />
          Scene Hierarchy
        </div>

        <SceneModelRow />

        <div className="flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
          {hotspots.length === 0 ? (
            <div className="editor-empty-state">
              <MapPin
                className="mx-auto mb-2 h-8 w-8"
                style={{ color: "var(--editor-line)" }}
              />
              <div className="mb-1 text-[12px] font-semibold">No hotspots yet</div>
              <div className="text-[11px]">
                Switch to{" "}
                <span style={{ color: "var(--editor-crimson-2)" }}>Add</span> mode
                and click on the model.
              </div>
            </div>
          ) : (
            hotspots.map((hotspot) => (
              <HotspotListItem
                key={hotspot.id}
                hotspot={hotspot}
                selected={selectedId === hotspot.id}
                onSelect={() => handleSelect(hotspot.id)}
                onFocus={() => {
                  handleSelect(hotspot.id);
                  window.dispatchEvent(
                    new CustomEvent("editor:focus-hotspot", {
                      detail: { id: hotspot.id },
                    }),
                  );
                }}
                onDelete={() => handleDelete(hotspot.id)}
              />
            ))
          )}
        </div>
      </div>
    </aside>
  );
}

export function OutlinerExpandTab() {
  const collapsed = useUIStore((s) => s.outlinerCollapsed);
  const setCollapsed = useUIStore((s) => s.setOutlinerCollapsed);

  if (!collapsed) return null;

  return (
    <button
      type="button"
      className="editor-outliner-tab"
      title="Show outliner"
      onClick={() => setCollapsed(false)}
    >
      <ChevronRight className="h-3 w-3" />
    </button>
  );
}
