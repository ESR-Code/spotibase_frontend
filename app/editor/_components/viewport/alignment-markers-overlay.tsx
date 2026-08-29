"use client";

import { useGeoPickOverlayStore } from "@/lib/editor/state/geo-pick-overlay-store";

export function AlignmentMarkersOverlay() {
  const markers = useGeoPickOverlayStore((s) => s.markers);
  const visible = markers.filter((m) => m.visible);
  const alignment = visible.filter((m) => m.kind === "alignment");
  if (markers.length === 0) return null;

  const line = alignment
    .map((m) => `${m.x},${m.y}`)
    .join(" ");

  return (
    <div className="editor-align-overlay pointer-events-none absolute inset-0 z-20 overflow-hidden">
      <svg className="absolute inset-0 h-full w-full">
        {alignment.length >= 2 ? (
          <polyline
            fill="none"
            stroke="var(--editor-teal)"
            strokeWidth="2"
            strokeDasharray="6 4"
            points={line}
          />
        ) : null}
      </svg>
      {visible.map((m) => (
        <div
          key={m.id}
          className={`editor-align-marker editor-align-marker-${m.kind}`}
          style={{ left: m.x, top: m.y }}
        >
          {m.label}
        </div>
      ))}
    </div>
  );
}
