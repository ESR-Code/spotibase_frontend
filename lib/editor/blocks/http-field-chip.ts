import type { FieldSourceKind } from "@/lib/editor/blocks/http-field-sources";
import {
  formatResolvedFieldValue,
  getValueByPath,
} from "@/lib/editor/blocks/json-paths";

export const HTTP_FIELD_CHIP_CLASS = "editor-http-field-chip";
export const FIELD_CHIP_KIND_ATTR = "data-field-kind";

export function buildHttpFieldChipHtml(
  nodeId: string,
  path: string,
  kind: FieldSourceKind = "http",
): string {
  const safeNode = escapeAttr(nodeId);
  const safePath = escapeAttr(path);
  const safeKind = escapeAttr(kind);
  const label = escapeHtml(path);
  return `<span class="${HTTP_FIELD_CHIP_CLASS}" ${FIELD_CHIP_KIND_ATTR}="${safeKind}" data-http-node="${safeNode}" data-http-path="${safePath}" contenteditable="false">${label}</span>`;
}

export function resolveHttpFieldsInHtml(
  html: string,
  resolve: (nodeId: string, path: string) => unknown,
  resolveKind?: (nodeId: string) => FieldSourceKind | undefined,
): string {
  if (typeof window === "undefined") return html;
  if (!html.includes(HTTP_FIELD_CHIP_CLASS)) return html;

  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return html;

  root.querySelectorAll(`.${HTTP_FIELD_CHIP_CLASS}`).forEach((el) => {
    const nodeId = el.getAttribute("data-http-node") ?? "";
    const path = el.getAttribute("data-http-path") ?? "";
    const value = resolve(nodeId, path);
    el.textContent = formatResolvedFieldValue(value);
    el.setAttribute("data-resolved", value === undefined ? "missing" : "ok");

    const existingKind = el.getAttribute(FIELD_CHIP_KIND_ATTR);
    if (!existingKind && resolveKind) {
      const kind = resolveKind(nodeId);
      if (kind) el.setAttribute(FIELD_CHIP_KIND_ATTR, kind);
    }
  });

  return root.innerHTML;
}

/** Replace field chips with their current text so preview does not re-resolve them. */
export function unwrapHttpFieldChips(html: string): string {
  if (typeof window === "undefined") return html;
  if (!html.includes(HTTP_FIELD_CHIP_CLASS)) return html;

  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return html;

  root.querySelectorAll(`.${HTTP_FIELD_CHIP_CLASS}`).forEach((el) => {
    const missing = el.getAttribute("data-resolved") === "missing";
    const text = missing ? "" : (el.textContent ?? "");
    el.replaceWith(doc.createTextNode(text));
  });

  return root.innerHTML;
}

export function resolveHttpFieldValue(
  data: unknown,
  path: string,
): unknown {
  return getValueByPath(data, path);
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtml(value: string): string {
  return escapeAttr(value).replace(/'/g, "&#39;");
}
