export type EmbedVideoProvider = "youtube" | "vimeo";

export type EmbedVideo = {
  provider: EmbedVideoProvider;
  embedUrl: string;
};

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"]);

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d+$/;

function normalizeUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

function youtubeIdFromUrl(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) return null;

  if (host === "youtu.be" || host === "www.youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return YOUTUBE_ID.test(id) ? id : null;
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") {
    const id = parts[1] ?? "";
    return YOUTUBE_ID.test(id) ? id : null;
  }

  const fromQuery = url.searchParams.get("v") ?? "";
  return YOUTUBE_ID.test(fromQuery) ? fromQuery : null;
}

function vimeoIdFromUrl(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  if (!VIMEO_HOSTS.has(host)) return null;

  const parts = url.pathname.split("/").filter(Boolean);
  if (host === "player.vimeo.com") {
    const id = parts[0] === "video" ? (parts[1] ?? "") : "";
    return VIMEO_ID.test(id) ? id : null;
  }

  if (parts[0] === "video" && parts[1]) {
    return VIMEO_ID.test(parts[1]) ? parts[1] : null;
  }
  if (parts[0] === "channels" && parts[2]) {
    return VIMEO_ID.test(parts[2]) ? parts[2] : null;
  }
  if (parts[0] === "groups" && parts[3] === "videos" && parts[4]) {
    return VIMEO_ID.test(parts[4]) ? parts[4] : null;
  }

  const id = parts[0] ?? "";
  return VIMEO_ID.test(id) ? id : null;
}

/** Parse a YouTube or Vimeo watch/share URL into a privacy-aware embed URL. */
export function parseEmbedVideoUrl(raw: string): EmbedVideo | null {
  const url = normalizeUrl(raw);
  if (!url) return null;

  const youtubeId = youtubeIdFromUrl(url);
  if (youtubeId) {
    return {
      provider: "youtube",
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}`,
    };
  }

  const vimeoId = vimeoIdFromUrl(url);
  if (vimeoId) {
    return {
      provider: "vimeo",
      embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
    };
  }

  return null;
}

export function embedVideoUrlHasTokens(raw: string): boolean {
  return /\{\{[^}]+\}\}/.test(raw);
}
