import { tryParseJson } from "@/lib/editor/blocks/json-paths";
import { useHttpResponseStore } from "@/lib/editor/state/http-response-store";
import type {
  HttpMethod,
  HttpRequestActionNode,
} from "@/lib/editor/types/hotspot-action";
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

export function validateHttpRequestData(
  data: Pick<
    HttpRequestActionNode["data"],
    "url" | "headersJson" | "method" | "body" | "cacheReuse"
  >,
): string | null {
  if (!data.url.trim()) return "Enter a URL";
  if (!normalizeExternalUrl(data.url)) return "Enter a valid URL";
  const headers = parseHeadersJson(data.headersJson);
  if (!headers.ok) return headers.error;
  return null;
}

export async function executeHttpRequest(
  data: Pick<
    HttpRequestActionNode["data"],
    "method" | "url" | "headersJson" | "body"
  >,
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

  const init: RequestInit = {
    method: data.method,
    headers: headersParsed.value,
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
      body = await response.text();
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
    return {
      ok: false,
      status: null,
      statusText: "",
      durationMs: Math.round(performance.now() - started),
      headers: {},
      body: "",
      error: error instanceof Error ? error.message : "Request failed",
      json: undefined,
    };
  }
}

export function httpRequestCacheKey(hotspotId: number, nodeId: string): string {
  return `${hotspotId}:${nodeId}`;
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
