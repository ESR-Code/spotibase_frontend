import { DataApiError } from "@/lib/api/data";
import type { ProjectRow } from "@/lib/projects/types";

export const PROJECT_THUMBNAIL_PLACEHOLDER = "/projects/preview-placeholder.svg";
export const MAX_THUMBNAIL_SOURCE_BYTES = 20 * 1024 * 1024;

const THUMBNAIL_WIDTH = 1920;
const THUMBNAIL_HEIGHT = 1080;
const THUMBNAIL_TYPE = "image/webp";
const THUMBNAIL_QUALITY = 0.86;

type UploadTicket = {
  key: string;
  url: string;
  method: "PUT";
  headers: Record<string, string>;
};

export function projectThumbnailSrc(project: Pick<ProjectRow, "thumbnail_r2_key">) {
  return project.thumbnail_r2_key
    ? `/gateway/files/${project.thumbnail_r2_key}`
    : PROJECT_THUMBNAIL_PLACEHOLDER;
}

async function storageJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body) headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");
  const res = await fetch(`/gateway/storage/${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { error?: string };
      detail = body.error || detail;
    } catch {
      /* ignore */
    }
    throw new DataApiError(detail || `Storage ${res.status}`, res.status);
  }
  return (await res.json()) as T;
}

/** Center-crops to 16:9, downsizes to at most 1920x1080, and encodes WebP. */
export async function toThumbnailWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const targetRatio = THUMBNAIL_WIDTH / THUMBNAIL_HEIGHT;
    let sw = bitmap.width;
    let sh = bitmap.height;
    if (sw / sh > targetRatio) sw = Math.round(sh * targetRatio);
    else sh = Math.round(sw / targetRatio);
    const sx = Math.round((bitmap.width - sw) / 2);
    const sy = Math.round((bitmap.height - sh) / 2);

    const width = Math.min(THUMBNAIL_WIDTH, sw);
    const height = Math.round(width / targetRatio);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available.");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, THUMBNAIL_TYPE, THUMBNAIL_QUALITY),
    );
    if (!blob || blob.type !== THUMBNAIL_TYPE) {
      throw new Error("This browser cannot encode WebP images.");
    }
    return blob;
  } finally {
    bitmap.close();
  }
}

export async function uploadProjectThumbnail(projectId: string, file: File) {
  const blob = await toThumbnailWebp(file);
  const base = `projects/${encodeURIComponent(projectId)}/thumbnail`;
  const ticket = await storageJson<UploadTicket>(`${base}/upload-url`, { method: "POST" });

  const put = await fetch(ticket.url, {
    method: ticket.method,
    headers: ticket.headers,
    body: blob,
  });
  if (!put.ok) throw new Error(`Upload failed (${put.status}).`);

  return storageJson<ProjectRow>(`${base}/commit`, {
    method: "POST",
    body: JSON.stringify({ key: ticket.key }),
  });
}

export async function removeProjectThumbnail(projectId: string) {
  return storageJson<ProjectRow | { ok: true }>(
    `projects/${encodeURIComponent(projectId)}/thumbnail`,
    { method: "DELETE" },
  );
}
