import {
  findActionNodeOwner,
  findHttpRequestNodeById,
  ownerKeyFor,
} from "@/lib/editor/actions/action-owners";
import {
  HTTP_FIELD_CHIP_CLASS,
  resolveHttpFieldsInHtml,
  unwrapHttpFieldChips,
} from "@/lib/editor/blocks/http-field-chip";
import { getHttpRequestCached, httpRequestCacheKey } from "@/lib/editor/actions/http-request";
import {
  listAllFieldSources,
  type HttpFieldSource,
} from "@/lib/editor/blocks/http-field-sources";
import {
  formatResolvedFieldValue,
  getValueByPath,
  tryParseJson,
} from "@/lib/editor/blocks/json-paths";

/** `{{user.id}}` or `{{user.id@nodeId}}` when the path is used by multiple nodes. */
export const FIELD_TOKEN_RE = /\{\{([^}@]+?)(?:@([^}]+))?\}\}/g;

export function hasFieldTokens(value: string): boolean {
  FIELD_TOKEN_RE.lastIndex = 0;
  const found = FIELD_TOKEN_RE.test(value);
  FIELD_TOKEN_RE.lastIndex = 0;
  return found;
}

export function buildFieldToken(
  source: Pick<HttpFieldSource, "nodeId" | "path">,
  sources: Array<Pick<HttpFieldSource, "nodeId" | "path">>,
): string {
  const ambiguous =
    sources.filter((item) => item.path === source.path).length > 1;
  return ambiguous
    ? `{{${source.path}@${source.nodeId}}}`
    : `{{${source.path}}}`;
}

type ActionItemScope = {
  item: unknown;
  index: number;
};

const itemScopeStack: ActionItemScope[] = [];

/** Run `fn` with the current For Each item as the first interpolation scope. */
export async function withActionItemScope<T>(
  item: unknown,
  index: number,
  fn: () => T | Promise<T>,
): Promise<T> {
  itemScopeStack.push({ item, index });
  try {
    return await fn();
  } finally {
    itemScopeStack.pop();
  }
}

export function peekActionItemScope(): ActionItemScope | null {
  return itemScopeStack.at(-1) ?? null;
}

/** Sync variant for editor sample evaluation. */
export function withActionItemScopeSync<T>(
  item: unknown,
  index: number,
  fn: () => T,
): T {
  itemScopeStack.push({ item, index });
  try {
    return fn();
  } finally {
    itemScopeStack.pop();
  }
}

/**
 * Parse `items`, `{{items}}`, or `{{items@nodeId}}` into a path + optional node.
 */
export function unwrapFieldPath(raw: string): { path: string; nodeId?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { path: "" };
  FIELD_TOKEN_RE.lastIndex = 0;
  const match = FIELD_TOKEN_RE.exec(trimmed);
  FIELD_TOKEN_RE.lastIndex = 0;
  if (match && match[0] === trimmed) {
    return {
      path: String(match[1] ?? "").trim(),
      nodeId: match[2] ? String(match[2]) : undefined,
    };
  }
  return { path: trimmed };
}

export function resolveActionFieldValue(
  path: string,
  nodeId?: string,
): unknown {
  const scope = peekActionItemScope();
  if (scope && !nodeId) {
    if (path === "" || path === ".") return scope.item;
    const fromItem = getValueByPath(scope.item, path);
    if (fromItem !== undefined) return fromItem;
  }

  if (nodeId) {
    return resolveFromNode(nodeId, path);
  }

  // Unique-path tokens: pick the first node that has this field.
  // Prefer a live preview/session value when present.
  for (const source of listAllFieldSources()) {
    if (source.path !== path) continue;
    const value = resolveFromNode(source.nodeId, path);
    if (value !== undefined) return value;
  }
  return undefined;
}

function resolveFromNode(nodeId: string, path: string): unknown {
  const found = findHttpRequestNodeById(nodeId);
  if (!found) return undefined;

  const key = httpRequestCacheKey(ownerKeyFor(found.ownerId), found.node.id);
  const runtime = getHttpRequestCached(key);
  if (runtime !== undefined) {
    return getValueByPath(runtime, path);
  }

  const sample = tryParseJson(found.sampleJson);
  if (sample === undefined) return undefined;
  return getValueByPath(sample, path);
}

function isInsideJsonString(source: string, index: number): boolean {
  let inString = false;
  let escaped = false;
  for (let i = 0; i < index; i++) {
    const ch = source[i];
    if (!inString) {
      if (ch === '"') inString = true;
      continue;
    }
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') inString = false;
  }
  return inString;
}

function escapeJsonStringContents(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

function jsonLiteral(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "null";
  }
}

export function interpolatePlainText(template: string): string {
  if (!template || !hasFieldTokens(template)) return template;
  return template.replace(FIELD_TOKEN_RE, (_match, path: string, nodeId?: string) => {
    const value = resolveActionFieldValue(path.trim(), nodeId);
    if (value === undefined) return "";
    const formatted = formatResolvedFieldValue(value);
    return formatted === "—" ? "" : formatted;
  });
}

/**
 * Resolve rich-text field chips (and any `{{tokens}}`) against the current
 * For Each item / HTTP node, then unwrap chips to plain text.
 */
export function interpolateRichTextHtml(html: string): string {
  if (!html) return html;
  let next = html;
  if (html.includes(HTTP_FIELD_CHIP_CLASS)) {
    next = resolveHttpFieldsInHtml(next, resolveChipFieldValue);
    next = unwrapHttpFieldChips(next);
  }
  return interpolatePlainText(next);
}

function resolveChipFieldValue(nodeId: string, path: string): unknown {
  const scope = peekActionItemScope();
  if (scope) {
    const owner = nodeId ? findActionNodeOwner(nodeId) : null;
    if (!nodeId || owner?.node.type === "forEach") {
      if (path === "" || path === ".") return scope.item;
      const fromItem = getValueByPath(scope.item, path);
      if (fromItem !== undefined) return fromItem;
    }
    const fromItem = getValueByPath(scope.item, path);
    if (fromItem !== undefined) return fromItem;
  }
  return resolveActionFieldValue(path, nodeId || undefined);
}

export function interpolateJsonText(template: string): string {
  if (!template || !hasFieldTokens(template)) return template;
  return template.replace(
    FIELD_TOKEN_RE,
    (match, path: string, nodeId: string | undefined, offset: number) => {
      const value = resolveActionFieldValue(path.trim(), nodeId);
      if (isInsideJsonString(template, offset)) {
        if (value === undefined || value === null) return "";
        if (typeof value === "string") return escapeJsonStringContents(value);
        if (typeof value === "number" || typeof value === "boolean") {
          return String(value);
        }
        try {
          return escapeJsonStringContents(JSON.stringify(value));
        } catch {
          return "";
        }
      }
      return jsonLiteral(value);
    },
  );
}

export function looksLikeJson(raw: string): boolean {
  const trimmed = raw.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

/** Replace tokens so URL / JSON validation can still run in the editor. */
export function substituteTokensForValidation(
  template: string,
  fallback: string,
): string {
  if (!template || !hasFieldTokens(template)) return template;
  return template.replace(FIELD_TOKEN_RE, fallback);
}

export function interpolateHttpRequestFields(data: {
  url: string;
  headersJson: string;
  body: string;
}): { url: string; headersJson: string; body: string } {
  return {
    url: interpolatePlainText(data.url),
    headersJson: looksLikeJson(data.headersJson)
      ? interpolateJsonText(data.headersJson)
      : interpolatePlainText(data.headersJson),
    body: looksLikeJson(data.body)
      ? interpolateJsonText(data.body)
      : interpolatePlainText(data.body),
  };
}

export function interpolatePostMessageFields(data: {
  eventName: string;
  payloadJson: string;
  targetOrigin: string;
}): { eventName: string; payloadJson: string; targetOrigin: string } {
  return {
    eventName: interpolatePlainText(data.eventName),
    payloadJson: looksLikeJson(data.payloadJson)
      ? interpolateJsonText(data.payloadJson)
      : interpolatePlainText(data.payloadJson),
    targetOrigin: interpolatePlainText(data.targetOrigin),
  };
}

export function insertTextAt(
  value: string,
  insert: string,
  start: number,
  end = start,
): string {
  const from = Math.max(0, Math.min(start, value.length));
  const to = Math.max(from, Math.min(end, value.length));
  return `${value.slice(0, from)}${insert}${value.slice(to)}`;
}
