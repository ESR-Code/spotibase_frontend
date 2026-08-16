"use client";

import { ListTree, X } from "lucide-react";
import { useMemo, useState } from "react";
import { CategorySelect } from "@/app/editor/_components/ui/category-select";
import { CategoryOptionBadge } from "@/app/editor/_components/ui/category-option";
import { FieldLabel } from "@/app/editor/_components/ui/field-label";
import { GlassPanel } from "@/app/editor/_components/ui/glass-panel";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import { runHotspotActions } from "@/lib/editor/actions/run-hotspot-actions";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { usePreviewVisibilityStore } from "@/lib/editor/state/preview-visibility-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import { useUIStore } from "@/lib/editor/state/ui-store";
import type { Hotspot } from "@/lib/editor/types/hotspot";
import {
  LEGEND_CATEGORY_ALL,
  type LegendCategory,
} from "@/lib/editor/types/legend-category";

export function LegendButton() {
  const isPreview = useEditorStore((s) => s.isPreview);
  const legendEnabled = useSettingsStore((s) => s.legendEnabled);
  const open = useUIStore((s) => s.legendDrawerOpen);
  const setOpen = useUIStore((s) => s.setLegendDrawerOpen);
  const outlinerCollapsed = useUIStore((s) => s.outlinerCollapsed);

  if (!isPreview || !legendEnabled) return null;

  return (
    <div
      className="editor-legend-btn absolute bottom-4 z-10"
      style={{ left: outlinerCollapsed && !open ? "1rem" : "calc(18rem + 1rem)" }}
    >
      <div className="editor-glass editor-panel-shadow rounded-xl p-1">
        <button
          type="button"
          title="Legend"
          className={`editor-tool-btn ${open ? "active" : ""}`}
          onClick={() => setOpen(!open)}
        >
          <ListTree className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function LegendDrawer() {
  const isPreview = useEditorStore((s) => s.isPreview);
  const legendEnabled = useSettingsStore((s) => s.legendEnabled);
  const legendCategories = useSettingsStore((s) => s.legendCategories);
  const hotspots = useEditorStore((s) => s.hotspots);
  const disabledHotspotIds = usePreviewVisibilityStore(
    (s) => s.disabledHotspotIds,
  );
  const previewActiveHotspotId = useUIStore((s) => s.previewActiveHotspotId);
  const open = useUIStore((s) => s.legendDrawerOpen);
  const setOpen = useUIStore((s) => s.setLegendDrawerOpen);
  const category = useUIStore((s) => s.legendFilterCategory);
  const setCategory = useUIStore((s) => s.setLegendFilterCategory);

  const [search, setSearch] = useState("");

  const visible = isPreview && legendEnabled && open;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return hotspots.filter((hotspot) => {
      if (disabledHotspotIds.includes(hotspot.id)) return false;
      if (category !== LEGEND_CATEGORY_ALL && hotspot.category !== category) {
        return false;
      }
      if (!query) return true;
      const legendName = (hotspot.legendName || hotspot.title).toLowerCase();
      const title = hotspot.title.toLowerCase();
      return legendName.includes(query) || title.includes(query);
    });
  }, [hotspots, category, search, disabledHotspotIds]);

  const categoryById = useMemo(() => {
    const map = new Map<string, LegendCategory>();
    for (const item of legendCategories) map.set(item.id, item);
    return map;
  }, [legendCategories]);

  if (!isPreview || !legendEnabled) return null;

  return (
    <GlassPanel
      className={`editor-legend-drawer editor-glass editor-panel-shadow flex flex-col ${visible ? "open" : ""}`}
      aria-hidden={!visible}
    >
      <div
        className="flex flex-shrink-0 items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--editor-line-soft)" }}
      >
        <div>
          <div className="font-display text-[14px] font-bold">Legend</div>
          <div className="text-[11px]" style={{ color: "var(--editor-muted)" }}>
            {filtered.length} hotspot{filtered.length === 1 ? "" : "s"}
          </div>
        </div>
        <IconButton title="Close legend" onClick={() => setOpen(false)}>
          <X />
        </IconButton>
      </div>

      <div
        className="flex-shrink-0 space-y-3 p-4"
        style={{ borderBottom: "1px solid var(--editor-line-soft)" }}
      >
        <CategorySelect
          label="Category"
          value={category}
          categories={legendCategories}
          includeAllOption
          onChange={setCategory}
        />
        <div>
          <FieldLabel>Search</FieldLabel>
          <input
            className="editor-input"
            placeholder="Filter by legend name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
        {filtered.length === 0 ? (
          <div
            className="px-2 py-6 text-center text-[12px]"
            style={{ color: "var(--editor-muted)" }}
          >
            No hotspots match this filter
          </div>
        ) : (
          filtered.map((hotspot) => (
            <LegendListItem
              key={hotspot.id}
              hotspot={hotspot}
              category={
                hotspot.category
                  ? categoryById.get(hotspot.category) ?? null
                  : null
              }
              selected={previewActiveHotspotId === hotspot.id}
              onSelect={() => {
                runHotspotActions(hotspot.id);
                setOpen(false);
              }}
            />
          ))
        )}
      </div>
    </GlassPanel>
  );
}

function LegendListItem({
  hotspot,
  category,
  selected,
  onSelect,
}: {
  hotspot: Hotspot;
  category: LegendCategory | null;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={`editor-hot-item ${selected ? "selected" : ""}`}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      role="button"
      tabIndex={0}
    >
      <LegendMarkerVisual hotspot={hotspot} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="truncate text-[12.5px] font-semibold leading-tight">
          {hotspot.legendName || hotspot.title}
        </div>
        {category ? (
          <CategoryOptionBadge category={category} />
        ) : (
          <span
            className="text-[10.5px] font-medium"
            style={{ color: "var(--editor-muted-2)" }}
          >
            No category
          </span>
        )}
      </div>
    </div>
  );
}

function LegendMarkerVisual({ hotspot }: { hotspot: Hotspot }) {
  if (hotspot.style === "image" && hotspot.markerImage) {
    return (
      <span
        className="editor-hot-dot editor-hot-dot-lg overflow-hidden border"
        style={{ borderColor: "var(--editor-line)", background: "transparent" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={hotspot.markerImage}
          alt=""
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  if (hotspot.style === "number" && hotspot.number !== "") {
    return (
      <span
        className="editor-hot-dot editor-hot-dot-lg"
        style={{ background: hotspot.color }}
      >
        {hotspot.number}
      </span>
    );
  }

  if (hotspot.style === "icon" && hotspot.icon) {
    return (
      <span
        className="editor-hot-dot editor-hot-dot-lg"
        style={{ background: hotspot.color }}
      >
        {hotspot.icon}
      </span>
    );
  }

  return (
    <span
      className="editor-hot-dot editor-hot-dot-lg"
      style={{ background: hotspot.color }}
    />
  );
}
