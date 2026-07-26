"use client";

import { Focus } from "lucide-react";
import type { Hotspot } from "@/lib/editor/types/hotspot";

type HotspotListItemProps = {
  hotspot: Hotspot;
  selected: boolean;
  onSelect: () => void;
  onFocus: () => void;
};

const typeIcons: Record<Hotspot["type"], string> = {
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
          <span>{hotspot.type}</span>
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
    </div>
  );
}

function MarkerVisual({ hotspot }: { hotspot: Hotspot }) {
  if (hotspot.style === "image" && hotspot.markerImage) {
    return (
      <span
        className="editor-hot-dot overflow-hidden border"
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
      <span className="editor-hot-dot" style={{ background: hotspot.color }}>
        {hotspot.number}
      </span>
    );
  }

  if (hotspot.style === "icon" && hotspot.icon) {
    return (
      <span className="editor-hot-dot" style={{ background: hotspot.color }}>
        {hotspot.icon}
      </span>
    );
  }

  return (
    <span className="editor-hot-dot" style={{ background: hotspot.color }} />
  );
}
