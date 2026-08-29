"use client";

import {
  alignmentStepLabel,
  useAlignmentSessionStore,
} from "@/lib/editor/state/alignment-session-store";

export function AlignmentPickBanner() {
  const open = useAlignmentSessionStore((s) => s.open);
  const phase = useAlignmentSessionStore((s) => s.phase);
  const method = useAlignmentSessionStore((s) => s.method);
  const waitingFor = useAlignmentSessionStore((s) => s.waitingFor);
  const points = useAlignmentSessionStore((s) => s.points);

  if (!open || phase !== "align") return null;

  const label = alignmentStepLabel(method, waitingFor, points);
  const side =
    waitingFor === "local"
      ? "3D / 2D scene"
      : waitingFor === "geo"
        ? "Geo Map"
        : "Review";

  return (
    <div className="editor-align-banner pointer-events-none absolute left-1/2 top-4 z-30 -translate-x-1/2">
      <div className="editor-glass editor-panel-shadow rounded-xl px-3 py-2 text-center">
        <div
          className="text-[9px] font-bold uppercase tracking-wider"
          style={{ color: "var(--editor-muted-2)" }}
        >
          Waiting on {side}
        </div>
        <div className="font-display text-[12px] font-semibold">{label}</div>
      </div>
    </div>
  );
}
