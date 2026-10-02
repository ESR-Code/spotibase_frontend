const dateFormat = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "2-digit",
  year: "numeric",
});

const relativeFormat = new Intl.RelativeTimeFormat(undefined, {
  numeric: "auto",
  style: "short",
});

export function formatDate(iso: string) {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? iso : dateFormat.format(time);
}

export function formatRelative(iso: string) {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return iso;
  const seconds = Math.round((time - Date.now()) / 1000);
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) {
      return relativeFormat.format(Math.round(seconds / size), unit);
    }
  }
  return "just now";
}

const utcTimeFormat = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

const compactFormat = new Intl.NumberFormat(undefined, {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatTimeUtc(iso: string) {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? "" : `${utcTimeFormat.format(time)} UTC`;
}

export function formatCompact(value: number) {
  return compactFormat.format(value);
}

export function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}
