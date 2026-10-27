/** Iframe block height bounds, in CSS px. */
export const IFRAME_BLOCK_HEIGHT = { min: 120, max: 1200, default: 360 };

/**
 * Iframe blocks embed https:// pages only (no http, data:, javascript:, blob:).
 * A bare host (`example.com/page`) is read as https.
 */
export function parseIframeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Sandbox for embedded pages: scripts, forms and popups run, but without
 * `allow-same-origin` the page is an opaque origin (no cookies / storage of
 * its own origin, no access to the editor), and it cannot navigate the top
 * window.
 */
export const IFRAME_BLOCK_SANDBOX =
  "allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox";
