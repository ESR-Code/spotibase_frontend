/** Flatten a JSON value into selectable dotted/bracket paths. */
export function flattenJsonPaths(
  value: unknown,
  maxPaths = 250,
): { path: string; sample: string }[] {
  const out: { path: string; sample: string }[] = [];

  const walk = (current: unknown, path: string) => {
    if (out.length >= maxPaths) return;

    if (
      current === null ||
      typeof current === "string" ||
      typeof current === "number" ||
      typeof current === "boolean"
    ) {
      if (path) {
        out.push({ path, sample: formatSample(current) });
      }
      return;
    }

    if (Array.isArray(current)) {
      if (path) {
        out.push({ path, sample: `Array(${current.length})` });
      }
      current.slice(0, 25).forEach((item, index) => {
        const next = path ? `${path}[${index}]` : `[${index}]`;
        walk(item, next);
      });
      return;
    }

    if (typeof current === "object") {
      for (const [key, child] of Object.entries(
        current as Record<string, unknown>,
      )) {
        const next = path ? `${path}.${key}` : key;
        walk(child, next);
      }
    }
  };

  walk(value, "");
  return out;
}

function formatSample(value: string | number | boolean | null): string {
  if (value === null) return "null";
  if (typeof value === "string") {
    return value.length > 48 ? `${value.slice(0, 47)}…` : value;
  }
  return String(value);
}

/** Resolve `a.b[0].c` style paths against a JSON value. */
export function getValueByPath(root: unknown, path: string): unknown {
  const trimmed = path.trim();
  if (!trimmed) return undefined;

  const tokens: Array<string | number> = [];
  const re = /([^[.\]]+)|\[(\d+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(trimmed))) {
    if (match[1] != null) tokens.push(match[1]);
    else if (match[2] != null) tokens.push(Number(match[2]));
  }

  let current: unknown = root;
  for (const token of tokens) {
    if (current == null) return undefined;
    if (typeof token === "number") {
      if (!Array.isArray(current)) return undefined;
      current = current[token];
      continue;
    }
    if (typeof current !== "object" || Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[token];
  }
  return current;
}

export function tryParseJson(raw: string): unknown | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return undefined;
  }
}

export function formatResolvedFieldValue(value: unknown): string {
  if (value === undefined) return "—";
  if (value === null) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
