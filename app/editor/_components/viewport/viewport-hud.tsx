"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { GlassPanel } from "@/app/editor/_components/ui/glass-panel";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useSceneStore } from "@/lib/editor/state/scene-store";
import { useUIStore } from "@/lib/editor/state/ui-store";

const modeLabels = {
  select: { title: "Editor Mode — Select", hint: "Click a hotspot to edit. Drag to reposition." },
  add: { title: "Editor Mode — Add", hint: "Click anywhere on the model to place a hotspot." },
  preview: { title: "Preview Mode", hint: "Click any hotspot to view its content. Hover to see title." },
};

export function ViewportHud() {
  const mode = useEditorStore((s) => s.mode);
  const isPreview = useEditorStore((s) => s.isPreview);
  const hotspots = useEditorStore((s) => s.hotspots);
  const fps = useSceneStore((s) => s.fps);
  const triangleCount = useSceneStore((s) => s.triangleCount);
  const collapsed = useUIStore((s) => s.hudCollapsed);
  const setCollapsed = useUIStore((s) => s.setHudCollapsed);

  const label = isPreview ? modeLabels.preview : modeLabels[mode];

  return (
    <GlassPanel
      className={`editor-hud-panel rounded-xl ${collapsed ? "collapsed" : ""}`}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <span
          className="flex-1 text-[11px] font-bold uppercase tracking-wider"
          style={{ color: "var(--editor-muted)" }}
        >
          Viewport
        </span>
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-transparent text-[var(--editor-muted)] transition hover:bg-white/5 hover:text-[var(--editor-fg)]"
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
      <div className="editor-hud-body px-4 pb-4">
        <div className="font-display mb-1 text-[13px] font-semibold">
          {label.title}
        </div>
        <div className="mb-3 text-[11px]" style={{ color: "var(--editor-muted)" }}>
          {label.hint}
        </div>
        <div className="grid grid-cols-3 gap-3">
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
        className="text-[10px] uppercase tracking-wider"
        style={{ color: "var(--editor-muted-2)" }}
      >
        {label}
      </div>
      <div
        className="font-display text-[15px] font-bold"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
    </div>
  );
}
