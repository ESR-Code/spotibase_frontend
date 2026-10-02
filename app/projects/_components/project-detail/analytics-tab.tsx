"use client";

import { AreaChart } from "@/app/projects/_components/area-chart";
import { PanelBadge, PanelHeader } from "@/app/projects/_components/panel-header";
import type { ProjectTabProps } from "@/app/projects/_components/project-detail/types";
import {
  ANALYTICS_RANGES,
  buildAnalyticsPreview,
  type AnalyticsRange,
  type AnalyticsStat,
} from "@/app/projects/_lib/analytics-preview";
import { formatCompact } from "@/app/projects/_lib/format";
import { CircleCheck, Clock, Eye, FlaskConical, Globe, Share2, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

const STAT_META: Record<AnalyticsStat["id"], { icon: ReactNode; color: string; format: (v: number) => ReactNode }> = {
  views: { icon: <Eye />, color: "#fd4f6a", format: formatCompact },
  watch: {
    icon: <Clock />,
    color: "#4cd7f6",
    format: (v) => (
      <>
        {v.toLocaleString()}
        <span className="text-xl">h</span>
      </>
    ),
  },
  completion: { icon: <CircleCheck />, color: "#34d399", format: (v) => `${v}%` },
  shares: { icon: <Share2 />, color: "#f4a740", format: formatCompact },
};

function StatCard({ stat }: { stat: AnalyticsStat }) {
  const meta = STAT_META[stat.id];
  const up = stat.delta >= 0;
  return (
    <article className="studio-card flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="studio-eyebrow">{stat.label}</p>
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg [&_svg]:h-3.5 [&_svg]:w-3.5"
          style={{ color: meta.color, background: `color-mix(in srgb, ${meta.color} 14%, transparent)` }}
        >
          {meta.icon}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="studio-heading text-[34px] leading-none">{meta.format(stat.value)}</span>
        <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${up ? "text-[#34d399]" : "text-[#ff8395]"}`}>
          {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {up ? "+" : ""}
          {stat.delta.toFixed(1)}%
        </span>
      </div>
      <p className="text-[11px] font-semibold text-[var(--studio-muted)]">{stat.caption}</p>
    </article>
  );
}

export function AnalyticsTab({ project }: ProjectTabProps) {
  const [range, setRange] = useState<AnalyticsRange>("30d");
  const data = useMemo(
    () => buildAnalyticsPreview(project.id, project.created_at),
    [project.id, project.created_at],
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.stats.map((stat) => (
          <StatCard key={stat.id} stat={stat} />
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="studio-panel p-5 sm:p-6 lg:col-span-2">
          <PanelHeader
            title="Views Over Time"
            subtitle="Daily viewing volume across published experiences"
            aside={
              <div className="studio-segmented" role="group" aria-label="Time range">
                {ANALYTICS_RANGES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={range === item.id}
                    onClick={() => setRange(item.id)}
                    className="!w-auto px-2.5 text-[11px] font-bold"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            }
          />
          <div className="mt-6">
            <AreaChart points={data.series[range]} formatValue={(v) => `${v.toLocaleString()} views`} height={260} />
          </div>
        </section>

        <section className="studio-panel flex flex-col p-5 sm:p-6">
          <PanelHeader
            title="Geographic Reach"
            subtitle="Top viewer locations"
            aside={<Globe className="h-4 w-4 text-[var(--studio-teal)]" />}
          />
          <ul className="mt-6 flex flex-col gap-4">
            {data.reach.map((region) => (
              <li key={region.code}>
                <div className="mb-1.5 flex items-center justify-between gap-2 text-xs font-bold">
                  <span className="flex items-center gap-2 text-[var(--studio-fg)]">
                    <span className="font-mono text-[10px]" style={{ color: region.color }}>
                      {region.code}
                    </span>
                    {region.name}
                  </span>
                  <span className="font-mono text-[var(--studio-fg-2)]">{region.share}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--studio-chip)]">
                  <div
                    className="h-full rounded-full transition-[width] duration-700 ease-out"
                    style={{ width: `${region.share}%`, background: region.color, boxShadow: `0 0 10px ${region.color}` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-6">
            <PanelBadge icon={<FlaskConical />}>Sample data · analytics coming soon</PanelBadge>
          </div>
        </section>
      </div>
    </div>
  );
}
