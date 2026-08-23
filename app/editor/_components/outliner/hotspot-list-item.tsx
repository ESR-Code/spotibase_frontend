"use client";

import { Focus, Trash2 } from "lucide-react";
import { HotspotMarkerIcon } from "@/app/editor/_components/ui/hotspot-marker-icon";
import { hotspotShapeClass } from "@/lib/editor/theme/hotspot-shape";
import {
  hotspotTypeLabel,
  type Hotspot,
} from "@/lib/editor/types/hotspot";

type HotspotListItemProps = {
  hotspot: Hotspot;
  selected: boolean;
  onSelect: () => void;
  onFocus: () => void;
  onDelete: () => void;
};

const typeIcons: Record<Hotspot["type"], string> = {
  none: "○",
  info: "ℹ",
  warning: "⚠",
  spec: "◎",
  link: "↗",
};

export function HotspotListItem({
  hotspot,
  selected,
  onSelect,
  onFocus,
  onDelete,
}: HotspotListItemProps) {
  return (
    <div
      className={`editor-hot-item ${selected ? "selected" : ""}`}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      role="button"
      tabIndex={0}
    >
      <MarkerVisual hotspot={hotspot} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12.5px] font-semibold">{hotspot.title}</div>
        <div
          className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider"
          style={{ color: "var(--editor-muted-2)" }}
        >
          <span>{typeIcons[hotspot.type]}</span>
          <span>{hotspotTypeLabel(hotspot.type)}</span>
          <span>· HSP-{String(hotspot.id).padStart(3, "0")}</span>
        </div>
      </div>
      <button
        type="button"
        className="editor-btn-ghost rounded p-1"
        title="Focus"
        onClick={(e) => {
          e.stopPropagation();
          onFocus();
        }}
      >
        <Focus className="h-3 w-3" />
      </button>
      <button
        type="button"
        className="editor-btn-ghost rounded p-1"
        title="Delete hotspot"
        style={{ color: "var(--editor-crimson-2)" }}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

function MarkerVisual({ hotspot }: { hotspot: Hotspot }) {
  const shapeClass = hotspotShapeClass(hotspot.shape);

  if (hotspot.style === "image" && hotspot.markerImage) {
    return (
      <span
        className={`editor-hot-dot overflow-hidden border ${shapeClass}`}
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
        className={`editor-hot-dot ${shapeClass}`}
        style={{ background: hotspot.color }}
      >
        <span className="editor-marker-shape-content">{hotspot.number}</span>
      </span>
    );
  }

  if (hotspot.style === "icon" && hotspot.icon) {
    return (
      <span
        className={`editor-hot-dot ${shapeClass}`}
        style={{ background: hotspot.color }}
      >
        <span className="editor-marker-shape-content">
          <HotspotMarkerIcon icon={hotspot.icon} className="h-3 w-3" />
        </span>
      </span>
    );
  }

  return (
    <span
      className={`editor-hot-dot ${shapeClass}`}
      style={{ background: hotspot.color }}
    />
  );
}
