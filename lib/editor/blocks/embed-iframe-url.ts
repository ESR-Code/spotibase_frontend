/** Iframe block height bounds, in CSS px. */
export const IFRAME_BLOCK_HEIGHT = { min: 120, max: 1200, default: 360 };

/**
 * Why `raw` cannot be embedded, or null when it can. Simple checks only:
 * it must parse as a URL, use https (a bare `example.com/page` is read as
 * https), and have a dotted host (or `localhost`) so `asdf` is rejected.
 */
export function iframeUrlError(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return "Add a page URL";
  const hasScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed);
  if (/\s/.test(trimmed)) return "Not a valid URL";
  const hostWithPort = /^[^/:\s]+:\d+(?:[/?#]|$)/.test(trimmed);
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed) && !hasScheme && !hostWithPort) {
    return "Not a valid URL";
  }
  let url: URL;
  try {
    url = new URL(hasScheme ? trimmed : `https://${trimmed}`);
  } catch {
    return "Not a valid URL";
  }
  if (url.protocol === "http:") return "Use https:// — http pages cannot be embedded";
  if (url.protocol !== "https:") return "Only https:// pages can be embedded";
  if (!url.hostname.includes(".") && url.hostname !== "localhost") {
    return "Not a valid URL";
  }
  return null;
}

/** The https URL to embed, or null when `raw` is empty or invalid. */
export function parseIframeUrl(raw: string): string | null {
  if (iframeUrlError(raw)) return null;
  const trimmed = raw.trim();
  return new URL(
    /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`,
  ).toString();
}

/**
 * Sandbox for embedded pages: scripts, forms and popups run, but without
 * `allow-same-origin` the page is an opaque origin (no cookies / storage of
 * its own origin, no access to the editor), and it cannot navigate the top
 * window.
 */
export const IFRAME_BLOCK_SANDBOX =
  "allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox";
