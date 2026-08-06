/** Normalize a user-entered URL and open it in a new tab. */
export function normalizeExternalUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function openExternalUrl(raw: string): boolean {
  const href = normalizeExternalUrl(raw);
  if (!href || typeof window === "undefined") return false;
  window.open(href, "_blank", "noopener,noreferrer");
  return true;
}
