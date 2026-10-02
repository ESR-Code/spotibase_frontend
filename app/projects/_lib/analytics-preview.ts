/**
 * Illustrative analytics for the project detail page. There is no analytics
 * backend yet, so numbers are generated deterministically from the project id
 * (stable across reloads, different per project).
 */

export type AnalyticsRange = "30d" | "90d" | "all";

export const ANALYTICS_RANGES: { id: AnalyticsRange; label: string }[] = [
  { id: "30d", label: "30 Days" },
  { id: "90d", label: "90 Days" },
  { id: "all", label: "All Time" },
];

export type AnalyticsStat = {
  id: "views" | "watch" | "completion" | "shares";
  label: string;
  value: number;
  delta: number;
  caption: string;
};

export type ReachRegion = { code: string; name: string; share: number; color: string };

export type AnalyticsPreview = {
  stats: AnalyticsStat[];
  series: Record<AnalyticsRange, { label: string; value: number }[]>;
  reach: ReachRegion[];
};

function hashSeed(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const dayLabel = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const monthLabel = new Intl.DateTimeFormat(undefined, { month: "short", year: "2-digit" });

function wave(rand: () => number, count: number, base: number) {
  const phase = rand() * Math.PI * 2;
  const freq = 1.5 + rand() * 2;
  const raw = Array.from({ length: count }, (_, i) => {
    const t = i / Math.max(count - 1, 1);
    const trend = 0.7 + t * 0.6;
    const swing = 0.32 * Math.sin(phase + t * Math.PI * freq);
    const noise = (rand() - 0.5) * 0.18;
    return Math.max(0.05, base * (trend + swing + noise));
  });
  return raw.map((_, i) => {
    const window = raw.slice(Math.max(0, i - 1), i + 2);
    return Math.round(window.reduce((a, b) => a + b, 0) / window.length);
  });
}

function daySeries(rand: () => number, days: number, base: number, now: number) {
  return wave(rand, days, base).map((value, i) => ({
    label: dayLabel.format(now - (days - 1 - i) * 86_400_000),
    value,
  }));
}

const REGIONS: Omit<ReachRegion, "share">[] = [
  { code: "US", name: "United States", color: "#4cd7f6" },
  { code: "JP", name: "Japan", color: "#fd4f6a" },
  { code: "DE", name: "Germany", color: "#f4b740" },
  { code: "GB", name: "United Kingdom", color: "#ff8aa0" },
  { code: "WW", name: "Rest of World", color: "#5f6679" },
];

export function buildAnalyticsPreview(projectId: string, createdAt: string): AnalyticsPreview {
  const rand = mulberry32(hashSeed(projectId));
  const now = Date.now();
  const dailyBase = 1800 + rand() * 4200;

  const views = Math.round(dailyBase * 30 * (0.8 + rand() * 0.4));
  const stats: AnalyticsStat[] = [
    { id: "views", label: "Total Views", value: views, delta: 4 + rand() * 18, caption: "vs. previous 30-day window" },
    {
      id: "watch",
      label: "Watch Time",
      value: Math.round((views * (2 + rand() * 4)) / 60),
      delta: rand() * 12 - 2,
      caption: `Avg session ${(2 + rand() * 4).toFixed(1)}m`,
    },
    {
      id: "completion",
      label: "Completion Rate",
      value: Math.round(62 + rand() * 30),
      delta: rand() * 6 - 1,
      caption: "Visitors who reached the last scene",
    },
    {
      id: "shares",
      label: "Total Shares",
      value: Math.round(views * (0.02 + rand() * 0.03)),
      delta: 5 + rand() * 25,
      caption: "Review links & embeds",
    },
  ];

  const createdTime = Date.parse(createdAt);
  const monthsAlive = Number.isNaN(createdTime)
    ? 12
    : Math.min(24, Math.max(6, Math.ceil((now - createdTime) / (30 * 86_400_000))));
  const allTime = wave(rand, monthsAlive, dailyBase * 30).map((value, i) => {
    const date = new Date(now);
    date.setMonth(date.getMonth() - (monthsAlive - 1 - i));
    return { label: monthLabel.format(date), value };
  });

  const weights = REGIONS.map(() => 0.4 + rand());
  weights[0] += 1.2;
  const total = weights.reduce((a, b) => a + b, 0);
  const reach = REGIONS.map((region, i) => ({
    ...region,
    share: Math.round((weights[i] / total) * 100),
  }))
    .sort((a, b) => (a.code === "WW" ? 1 : b.code === "WW" ? -1 : b.share - a.share));

  return {
    stats,
    series: {
      "30d": daySeries(rand, 30, dailyBase, now),
      "90d": daySeries(rand, 90, dailyBase * 0.9, now),
      all: allTime,
    },
    reach,
  };
}
