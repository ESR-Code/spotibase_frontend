import { DataApiError } from "@/lib/api/data";
import type { OrganizationSummary, ProjectRow } from "@/lib/projects/types";

export const PROJECT_THUMBNAIL_PLACEHOLDER = "/projects/preview-placeholder.svg";
export const MAX_THUMBNAIL_SOURCE_BYTES = 20 * 1024 * 1024;

const THUMBNAIL_WIDTH = 1920;
const THUMBNAIL_HEIGHT = 1080;
const THUMBNAIL_TYPE = "image/webp";
const THUMBNAIL_QUALITY = 0.86;
const LOGO_SIZE = 512;

export type UploadTicket = {
  key: string;
  url: string;
  method: "PUT";
  headers: Record<string, string>;
};

/** Logos are R2 keys (`orgs/<id>/logo/<uuid>.webp`); anything else is ignored. */
export function organizationLogoSrc(org: Pick<OrganizationSummary, "logo"> | null | undefined) {
  return org?.logo?.startsWith("orgs/") ? `/gateway/files/${org.logo}` : null;
}

export function projectThumbnailSrc(project: Pick<ProjectRow, "thumbnail_r2_key">) {
  return project.thumbnail_r2_key
    ? `/gateway/files/${project.thumbnail_r2_key}`
    : PROJECT_THUMBNAIL_PLACEHOLDER;
}

export async function storageJson<T>(path: string, init?: RequestInit): Promise<T> {
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

/** Center-crops to `width`:`height`, downsizes to at most that size, and encodes WebP. */
async function toCroppedWebp(file: File, maxWidth: number, maxHeight: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const targetRatio = maxWidth / maxHeight;
    let sw = bitmap.width;
    let sh = bitmap.height;
    if (sw / sh > targetRatio) sw = Math.round(sh * targetRatio);
    else sh = Math.round(sw / targetRatio);
    const sx = Math.round((bitmap.width - sw) / 2);
    const sy = Math.round((bitmap.height - sh) / 2);

    const width = Math.min(maxWidth, sw);
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

/** Center-crops to 16:9, downsizes to at most 1920x1080, and encodes WebP. */
export function toThumbnailWebp(file: File): Promise<Blob> {
  return toCroppedWebp(file, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
}

async function uploadViaTicket<T>(base: string, blob: Blob) {
  const ticket = await storageJson<UploadTicket>(`${base}/upload-url`, { method: "POST" });

  const put = await fetch(ticket.url, {
    method: ticket.method,
    headers: ticket.headers,
    body: blob,
  });
  if (!put.ok) throw new Error(`Upload failed (${put.status}).`);

  return storageJson<T>(`${base}/commit`, {
    method: "POST",
    body: JSON.stringify({ key: ticket.key }),
  });
}

export async function uploadProjectThumbnail(projectId: string, file: File) {
  const blob = await toThumbnailWebp(file);
  return uploadViaTicket<ProjectRow>(`projects/${encodeURIComponent(projectId)}/thumbnail`, blob);
}

export async function removeProjectThumbnail(projectId: string) {
  return storageJson<ProjectRow | { ok: true }>(
    `projects/${encodeURIComponent(projectId)}/thumbnail`,
    { method: "DELETE" },
  );
}

/** Square-crops to at most 512x512 WebP and sets it as the organization logo. */
export async function uploadOrganizationLogo(organizationId: string, file: File) {
  const blob = await toCroppedWebp(file, LOGO_SIZE, LOGO_SIZE);
  return uploadViaTicket<OrganizationSummary>(`orgs/${encodeURIComponent(organizationId)}/logo`, blob);
}

export async function removeOrganizationLogo(organizationId: string) {
  return storageJson<OrganizationSummary | { ok: true }>(
    `orgs/${encodeURIComponent(organizationId)}/logo`,
    { method: "DELETE" },
  );
}

/** Deletes every editor asset object of a project (rows cascade with the project). */
export async function removeProjectAssets(projectId: string) {
  return storageJson<{ ok: true }>(
    `projects/${encodeURIComponent(projectId)}/assets`,
    { method: "DELETE" },
  );
}
