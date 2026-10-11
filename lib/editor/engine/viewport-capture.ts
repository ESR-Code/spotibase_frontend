/** Width of the JPEG used as a scene thumbnail. */
export const SCENE_THUMBNAIL_MAX_WIDTH = 1280;

type ViewportCapturer = () => string | null;

const capturers: ViewportCapturer[] = [];

/**
 * Register a live viewport capturer. The newest registration is tried first
 * so a geo map mounted over PlayCanvas wins.
 */
export function registerViewportCapturer(capture: ViewportCapturer): () => void {
  capturers.push(capture);
  return () => {
    const index = capturers.lastIndexOf(capture);
    if (index >= 0) capturers.splice(index, 1);
  };
}

/** Capture the active viewport. Returns null when no engine can read a frame. */
export function captureActiveViewport(): string | null {
  for (let i = capturers.length - 1; i >= 0; i -= 1) {
    try {
      const url = capturers[i]();
      if (url) return url;
    } catch {
      // A hidden or tainted canvas should not block the next capturer.
    }
  }
  return null;
}

export function dataUrlToJpegFile(dataUrl: string, name: string): File {
  const comma = dataUrl.indexOf(",");
  const body = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], name, { type: "image/jpeg" });
}
