const ALLOWED_TAGS = new Set([
  "B",
  "I",
  "U",
  "STRONG",
  "EM",
  "BR",
  "P",
  "DIV",
  "SPAN",
]);

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function isLikelyHtml(content: string): boolean {
  return /<[a-z][\s\S]*>/i.test(content);
}

/** Convert plain text (with newlines) into simple paragraph HTML. */
export function plainTextToHtml(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return "";
  return trimmed
    .split(/\n{2,}/)
    .map((paragraph) => {
      const withBreaks = escapeHtml(paragraph).replace(/\n/g, "<br>");
      return `<p>${withBreaks}</p>`;
    })
    .join("");
}

function sanitizeNode(node: Node, doc: Document): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return doc.createTextNode(node.textContent ?? "");
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const el = node as HTMLElement;
  const tag = el.tagName.toUpperCase();

  if (!ALLOWED_TAGS.has(tag)) {
    const fragment = doc.createDocumentFragment();
    Array.from(el.childNodes).forEach((child) => {
      const sanitized = sanitizeNode(child, doc);
      if (sanitized) fragment.appendChild(sanitized);
    });
    return fragment;
  }

  const clean = doc.createElement(tag === "STRONG" ? "b" : tag === "EM" ? "i" : tag.toLowerCase());
  Array.from(el.childNodes).forEach((child) => {
    const sanitized = sanitizeNode(child, doc);
    if (sanitized) clean.appendChild(sanitized);
  });
  return clean;
}

/** Keep only basic formatting tags for text blocks. */
export function sanitizeRichTextHtml(html: string): string {
  if (typeof window === "undefined") {
    return html.replace(/<(?!\/?(?:b|i|u|strong|em|br|p|div|span)\b)[^>]*>/gi, "");
  }

  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return "";

  const out = doc.createElement("div");
  Array.from(root.childNodes).forEach((child) => {
    const sanitized = sanitizeNode(child, doc);
    if (sanitized) out.appendChild(sanitized);
  });

  return out.innerHTML;
}

/** Normalize stored content for editing/preview (plain → HTML, HTML → sanitized). */
export function normalizeRichTextContent(content: string): string {
  if (!content.trim()) return "";
  if (!isLikelyHtml(content)) return plainTextToHtml(content);
  return sanitizeRichTextHtml(content);
}

/** Strip tags for collapsed-row previews. */
export function richTextToPlainPreview(content: string, maxLength = 80): string {
  const html = normalizeRichTextContent(content);
  const plain =
    typeof window === "undefined"
      ? html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
      : (() => {
          const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
          return (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
        })();
  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength - 1)}…`;
}
