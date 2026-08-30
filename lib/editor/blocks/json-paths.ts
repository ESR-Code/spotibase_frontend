/** JSONPath-style root. Used when the HTTP body itself is the array. */
export const JSON_ROOT_PATH = "$";

export function isJsonRootPath(path: string): boolean {
  const trimmed = path.trim();
  return trimmed === JSON_ROOT_PATH || trimmed === "." || trimmed === "this";
}

export function formatJsonPathLabel(path: string): string {
  return isJsonRootPath(path) ? "response" : path;
}

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
      out.push({
        path: path || JSON_ROOT_PATH,
        sample: `Array(${current.length})`,
      });
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

/** Split `a.b[0].c` into display segments: ["a", "b", "[0]", "c"]. */
export function tokenizeJsonPath(path: string): string[] {
  const tokens: string[] = [];
  const re = /([^[.\]]+)|\[(\d+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(path.trim()))) {
    if (match[1] != null) tokens.push(match[1]);
    else if (match[2] != null) tokens.push(`[${match[2]}]`);
  }
  return tokens;
}

function joinPathSegment(base: string, segment: string): string {
  if (!base) return segment;
  if (segment.startsWith("[")) return `${base}${segment}`;
  return `${base}.${segment}`;
}

export type JsonPathTreeNode = {
  id: string;
  segment: string;
  path: string;
  sample?: string;
  children: JsonPathTreeNode[];
};

/** Build a nested tree from flat JSON path entries (collapsed UI source). */
export function buildJsonPathTree(
  entries: Array<{ path: string; sample: string }>,
): JsonPathTreeNode[] {
  const roots: JsonPathTreeNode[] = [];
  const byPath = new Map<string, JsonPathTreeNode>();

  const ensure = (
    path: string,
    segment: string,
    siblings: JsonPathTreeNode[],
  ): JsonPathTreeNode => {
    const existing = byPath.get(path);
    if (existing) return existing;
    const node: JsonPathTreeNode = {
      id: path,
      segment,
      path,
      children: [],
    };
    byPath.set(path, node);
    siblings.push(node);
    return node;
  };

  for (const entry of entries) {
    const tokens = tokenizeJsonPath(entry.path);
    if (tokens.length === 0) continue;

    let siblings = roots;
    let pathSoFar = "";
    for (let i = 0; i < tokens.length; i += 1) {
      const segment = tokens[i]!;
      pathSoFar = joinPathSegment(pathSoFar, segment);
      const node = ensure(pathSoFar, segment, siblings);
      if (i === tokens.length - 1) {
        node.sample = entry.sample;
      }
      siblings = node.children;
    }
  }

  return roots;
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
  if (isJsonRootPath(trimmed)) return root;
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
