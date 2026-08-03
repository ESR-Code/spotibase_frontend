"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { GlassPanel } from "@/app/editor/_components/ui/glass-panel";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useModelStore } from "@/lib/editor/state/model-store";
import { useUIStore } from "@/lib/editor/state/ui-store";

const modeLabels = {
  select: {
    title: "Select",
    hint: "Click to edit · Drag to move",
  },
  add: {
    title: "Add",
    hint: "Click the model to place a hotspot",
  },
  preview: {
    title: "Preview",
    hint: "Click a hotspot to view · Hover for title",
  },
};

export function ViewportHud() {
  const mode = useEditorStore((s) => s.mode);
  const isPreview = useEditorStore((s) => s.isPreview);
  const hotspots = useEditorStore((s) => s.hotspots);
  const fps = useModelStore((s) => s.fps);
  const triangleCount = useModelStore((s) => s.triangleCount);
  const collapsed = useUIStore((s) => s.hudCollapsed);
  const setCollapsed = useUIStore((s) => s.setHudCollapsed);

  const label = isPreview ? modeLabels.preview : modeLabels[mode];

  return (
    <GlassPanel
      className={`editor-hud-panel rounded-xl ${collapsed ? "collapsed" : ""}`}
    >
      <div className="flex items-center gap-1.5 px-2.5 py-1.5">
        <span
          className="flex-1 text-[10px] font-bold uppercase tracking-wider"
          style={{ color: "var(--editor-muted)" }}
        >
          Viewport
        </span>
        {!collapsed ? (
          <span
            className="truncate text-[10px] font-semibold"
            style={{ color: "var(--editor-muted-2)" }}
          >
            {label.title}
          </span>
        ) : null}
        <button
          type="button"
          className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-transparent text-[var(--editor-muted)] transition hover:bg-white/5 hover:text-[var(--editor-fg)]"
          title={collapsed ? "Expand viewport info" : "Collapse viewport info"}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronDown className="h-2.5 w-2.5" />
          ) : (
            <ChevronUp className="h-2.5 w-2.5" />
          )}
        </button>
      </div>
      <div className="editor-hud-body px-2.5 pb-2.5 pt-0.5">
        <div className="font-display mb-0.5 text-[12px] font-semibold leading-tight">
          {label.title}
        </div>
        <div
          className="mb-2 text-[10px] leading-snug"
          style={{ color: "var(--editor-muted)" }}
        >
          {label.hint}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="FPS" value={String(fps)} />
          <Stat
            label="Hotspots"
            value={String(hotspots.length)}
            accent="var(--editor-crimson-2)"
          />
          <Stat label="Tris" value={triangleCount.toLocaleString()} />
        </div>
      </div>
    </GlassPanel>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div>
      <div
        className="text-[9px] uppercase tracking-wider"
        style={{ color: "var(--editor-muted-2)" }}
      >
        {label}
      </div>
      <div
        className="font-display text-[13px] font-bold leading-tight"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
    </div>
  );
}
