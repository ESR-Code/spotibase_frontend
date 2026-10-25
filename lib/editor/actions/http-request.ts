import { tryParseJson } from "@/lib/editor/blocks/json-paths";
import { useHttpResponseStore } from "@/lib/editor/state/http-response-store";
import type {
  HttpMethod,
  HttpRequestActionNode,
} from "@/lib/editor/types/hotspot-action";
import { interpolateHttpRequestFields, substituteTokensForValidation } from "@/lib/editor/actions/interpolate-fields";
import { trackRunRequest } from "@/lib/editor/actions/request-cancel";
import { normalizeExternalUrl } from "@/lib/editor/utils/open-external-url";

export type HttpRequestResult = {
  ok: boolean;
  status: number | null;
  statusText: string;
  durationMs: number;
  headers: Record<string, string>;
  body: string;
  error: string | null;
  /** Parsed JSON body when available. */
  json: unknown | undefined;
};

const METHODS_WITHOUT_BODY = new Set<HttpMethod>(["GET", "HEAD"]);

/** A request that has not finished by now is treated as hung. */
export const HTTP_REQUEST_TIMEOUT_MS = 15_000;
/** Larger responses are rejected instead of being read into memory. */
export const HTTP_MAX_RESPONSE_BYTES = 5 * 1024 * 1024;

class ResponseTooLargeError extends Error {}

/**
 * Requests run with the author's browser, but never as the signed-in user:
 * cookies are not sent (see `credentials: "omit"` below), so a project cannot
 * make a viewer's session perform actions. Beyond that, this app's own
 * gateway is off limits and its other routes are read-only.
 */
export function sameOriginRequestError(
  url: string | null,
  method: string | undefined,
): string | null {
  if (!url || typeof window === "undefined") return null;
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return null;
  }
  if (target.origin !== window.location.origin) return null;
  if (target.pathname === "/gateway" || target.pathname.startsWith("/gateway/")) {
    return "Requests to this app's own API are not allowed";
  }
  const upper = (method ?? "GET").toUpperCase();
  if (upper !== "GET" && upper !== "HEAD") {
    return "Requests to this app can only use GET or HEAD";
  }
  return null;
}

async function readBodyCapped(
  response: Response,
  maxBytes: number,
): Promise<string> {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    void response.body?.cancel();
    throw new ResponseTooLargeError();
  }
  if (!response.body) return response.text();

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      void reader.cancel();
      throw new ResponseTooLargeError();
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

export type HttpHeaderRow = {
  id: string;
  key: string;
  value: string;
};

function newHeaderRowId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `hdr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createEmptyHeaderRow(): HttpHeaderRow {
  return { id: newHeaderRowId(), key: "", value: "" };
}

export function parseHeadersJson(
  raw: string,
): { ok: true; value: Record<string, string> } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: {} };
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (
      parsed == null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return { ok: false, error: "Headers must be a JSON object" };
    }
    const value: Record<string, string> = {};
    for (const [key, entry] of Object.entries(
      parsed as Record<string, unknown>,
    )) {
      if (typeof entry !== "string") {
        return { ok: false, error: "Header values must be strings" };
      }
      value[key] = entry;
    }
    return { ok: true, value };
  } catch {
    return { ok: false, error: "Headers must be valid JSON" };
  }
}

/** Convert stored headers JSON into editable key/value rows. */
export function headersJsonToRows(raw: string): HttpHeaderRow[] {
  const parsed = parseHeadersJson(raw);
  if (!parsed.ok) return [createEmptyHeaderRow()];
  const entries = Object.entries(parsed.value);
  if (entries.length === 0) return [createEmptyHeaderRow()];
  return entries.map(([key, value]) => ({
    id: newHeaderRowId(),
    key,
    value,
  }));
}

/** Serialize editor rows back to headers JSON (skips blank keys). */
export function rowsToHeadersJson(rows: HttpHeaderRow[]): string {
  const value: Record<string, string> = {};
  for (const row of rows) {
    const key = row.key.trim();
    if (!key) continue;
    value[key] = row.value;
  }
  return JSON.stringify(value, null, 2);
}

export function countHeaderRows(raw: string): number {
  const parsed = parseHeadersJson(raw);
  if (!parsed.ok) return 0;
  return Object.keys(parsed.value).length;
}

export function validateHttpRequestData(
  data: Pick<
    HttpRequestActionNode["data"],
    "url" | "headersJson" | "method" | "body" | "cacheReuse"
  >,
): string | null {
  if (!data.url.trim()) return "Enter a URL";
  const urlForCheck = substituteTokensForValidation(data.url, "0");
  const normalized = normalizeExternalUrl(urlForCheck);
  if (!normalized) return "Enter a valid URL";
  const blocked = sameOriginRequestError(normalized, data.method);
  if (blocked) return blocked;
  const headersRaw = substituteTokensForValidation(data.headersJson, "x");
  const headers = parseHeadersJson(headersRaw);
  if (!headers.ok) return headers.error;
  return null;
}

export async function executeHttpRequest(
  data: Pick<
    HttpRequestActionNode["data"],
    "method" | "url" | "headersJson" | "body"
  >,
  options: {
    /** Abort when the running action chain is cancelled (Preview left, scene switched). */
    cancelWithRun?: boolean;
  } = {},
): Promise<HttpRequestResult> {
  const started = performance.now();
  const url = normalizeExternalUrl(data.url);
  if (!url) {
    return {
      ok: false,
      status: null,
      statusText: "",
      durationMs: 0,
      headers: {},
      body: "",
      error: "Invalid URL",
      json: undefined,
    };
  }

  const headersParsed = parseHeadersJson(data.headersJson);
  if (!headersParsed.ok) {
    return {
      ok: false,
      status: null,
      statusText: "",
      durationMs: 0,
      headers: {},
      body: "",
      error: headersParsed.error,
      json: undefined,
    };
  }

  const blocked = sameOriginRequestError(url, data.method);
  if (blocked) {
    return {
      ok: false,
      status: null,
      statusText: "",
      durationMs: 0,
      headers: {},
      body: "",
      error: blocked,
      json: undefined,
    };
  }

  const controller = new AbortController();
  const untrack = options.cancelWithRun ? trackRunRequest(controller) : null;
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, HTTP_REQUEST_TIMEOUT_MS);

  const init: RequestInit = {
    method: data.method,
    headers: headersParsed.value,
    signal: controller.signal,
    // Never send the session cookie to whatever URL a project points at.
    credentials: "omit",
  };

  if (!METHODS_WITHOUT_BODY.has(data.method) && data.body.trim()) {
    init.body = data.body;
  }

  try {
    const response = await fetch(url, init);
    const durationMs = Math.round(performance.now() - started);
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    let body = "";
    if (data.method !== "HEAD") {
      body = await readBodyCapped(response, HTTP_MAX_RESPONSE_BYTES);
    }

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      durationMs,
      headers,
      body,
      error: null,
      json: tryParseJson(body),
    };
  } catch (error) {
    let message = error instanceof Error ? error.message : "Request failed";
    if (error instanceof ResponseTooLargeError) {
      message = `Response is larger than ${HTTP_MAX_RESPONSE_BYTES / (1024 * 1024)} MB`;
    } else if (timedOut) {
      message = `Request timed out after ${HTTP_REQUEST_TIMEOUT_MS / 1000} s`;
    } else if (controller.signal.aborted) {
      message = "Request cancelled";
    }
    return {
      ok: false,
      status: null,
      statusText: "",
      durationMs: Math.round(performance.now() - started),
      headers: {},
      body: "",
      error: message,
      json: undefined,
    };
  } finally {
    clearTimeout(timer);
    untrack?.();
  }
}

export function httpRequestCacheKey(ownerKey: string, nodeId: string): string {
  return `${ownerKey}:${nodeId}`;
}

export function hasHttpRequestCached(key: string): boolean {
  return useHttpResponseStore.getState().hasResponse(key);
}

export function markHttpRequestCached(key: string, data: unknown): void {
  useHttpResponseStore.getState().setResponse(key, data);
}

export function getHttpRequestCached(key: string): unknown | undefined {
  return useHttpResponseStore.getState().getResponse(key);
}

/**
 * Live preview JSON for one node. Prefers `ownerKey:nodeId`, then any other
 * session entry for that node. `null` means a non-JSON response and is ignored
 * when another entry has a real payload.
 */
export function getHttpRequestCachedForNode(
  ownerKey: string,
  nodeId: string,
): unknown | undefined {
  const primary = getHttpRequestCached(httpRequestCacheKey(ownerKey, nodeId));
  const suffix = `:${nodeId}`;
  let fallback: unknown;
  let foundFallback = false;
  for (const [key, value] of Object.entries(useHttpResponseStore.getState().byKey)) {
    if (!key.endsWith(suffix) || value == null) continue;
    fallback = value;
    foundFallback = true;
    break;
  }
  if (primary != null) return primary;
  if (foundFallback) return fallback;
  return primary;
}

export function clearHttpRequestCached(key: string): void {
  useHttpResponseStore.getState().clearResponse(key);
}

export function clearHttpRequestCache(): void {
  useHttpResponseStore.getState().clear();
}

export function formatHttpResultPreview(
  result: HttpRequestResult,
  maxBodyChars = 1200,
): string {
  if (result.error && result.status == null) {
    return result.error;
  }
  const headerLines = Object.entries(result.headers)
    .slice(0, 12)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  const body =
    result.body.length > maxBodyChars
      ? `${result.body.slice(0, maxBodyChars)}\n…`
      : result.body;
  return [
    `Status: ${result.status ?? "—"} ${result.statusText}`.trim(),
    `Time: ${result.durationMs}ms`,
    headerLines ? `Headers:\n${headerLines}` : "Headers: (none)",
    body ? `Body:\n${body}` : "Body: (empty)",
  ].join("\n\n");
}
