"use client";

import { useId, useMemo, useState, type PointerEvent } from "react";

export type AreaChartPoint = { label: string; value: number };

type Coord = { x: number; y: number };

const TOP_PAD = 12;
const BOTTOM_PAD = 6;

function toCoords(points: AreaChartPoint[]): Coord[] {
  const max = Math.max(...points.map((p) => p.value), 1);
  const min = Math.min(...points.map((p) => p.value), 0);
  const span = max - min || 1;
  const last = Math.max(points.length - 1, 1);
  return points.map((p, i) => ({
    x: (i / last) * 100,
    y: TOP_PAD + (1 - (p.value - min) / span) * (100 - TOP_PAD - BOTTOM_PAD),
  }));
}

/** Catmull-Rom spline as cubic béziers, clamped to the viewBox. */
function smoothPath(coords: Coord[]) {
  if (!coords.length) return "";
  const clamp = (v: number) => Math.min(100, Math.max(0, v));
  let d = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i - 1] ?? coords[i];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: clamp(p1.y + (p2.y - p0.y) / 6) };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: clamp(p2.y - (p3.y - p1.y) / 6) };
    d += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function AreaChart({
  points,
  formatValue = String,
  height = 240,
}: {
  points: AreaChartPoint[];
  formatValue?: (value: number) => string;
  height?: number;
}) {
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);
  const coords = useMemo(() => toCoords(points), [points]);
  const line = useMemo(() => smoothPath(coords), [coords]);
  const area = coords.length ? `${line} L 100 100 L 0 100 Z` : "";

  const peak = useMemo(
    () => points.reduce((best, p, i) => (p.value > points[best].value ? i : best), 0),
    [points],
  );
  const markers = Array.from(new Set([peak, points.length - 1]));
  const active = hover !== null ? coords[hover] : null;

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    setHover(Math.round(Math.min(1, Math.max(0, ratio)) * (points.length - 1)));
  }

  if (!points.length) return null;

  return (
    <div>
      <div
        className="relative w-full touch-none"
        style={{ height }}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHover(null)}
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id={`${gradientId}-stroke`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#4cd7f6" />
              <stop offset="0.55" stopColor="#fd4f6a" />
              <stop offset="1" stopColor="#f4a740" />
            </linearGradient>
            <linearGradient id={`${gradientId}-fill`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#fd4f6a" stopOpacity="0.32" />
              <stop offset="1" stopColor="#fd4f6a" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[25, 50, 75].map((y) => (
            <line
              key={y}
              x1="0"
              x2="100"
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="1.5 1.5"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path d={area} fill={`url(#${gradientId}-fill)`} />
          <path
            d={line}
            fill="none"
            stroke={`url(#${gradientId}-stroke)`}
            strokeWidth="2.5"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {active ? (
            <line
              x1={active.x}
              x2={active.x}
              y1="0"
              y2="100"
              stroke="rgba(255,255,255,0.18)"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
        </svg>

        {markers.map((i) => (
          <span
            key={i}
            className="studio-chart-dot"
            style={{
              left: `${coords[i].x}%`,
              top: `${coords[i].y}%`,
              background: i === peak ? "#fd4f6a" : "#f4a740",
              boxShadow: `0 0 12px ${i === peak ? "#fd4f6a" : "#f4a740"}`,
            }}
          />
        ))}

        {active && hover !== null ? (
          <>
            <span
              className="studio-chart-dot"
              style={{ left: `${active.x}%`, top: `${active.y}%`, background: "#fff" }}
            />
            <span className="studio-chart-tip" style={{ left: `${active.x}%`, top: `${active.y}%` }}>
              <span className="text-[var(--studio-muted)]">{points[hover].label}</span>
              <span className="ml-2 text-[var(--studio-fg)]">{formatValue(points[hover].value)}</span>
            </span>
          </>
        ) : null}
      </div>
      <div className="mt-2 flex justify-between text-[10px] font-bold text-[var(--studio-muted-2)]">
        <span>{points[0].label}</span>
        <span>{points[Math.floor((points.length - 1) / 2)].label}</span>
        <span>{points[points.length - 1].label}</span>
      </div>
    </div>
  );
}
