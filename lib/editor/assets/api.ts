import { dataJson } from "@/lib/api/data";
import {
  assetFromRow,
  type AssetRow,
  type EditorAsset,
  type EditorAssetKind,
} from "@/lib/editor/assets/types";
import { storageJson, type UploadTicket } from "@/lib/projects/storage";

const ASSET_COLUMNS =
  "id,kind,status,name,filename,content_type,size,width,height,r2_key,scene_id,created_at";

const MB = 1024 * 1024;

/** Mirrors the Worker allowlist (`worker/src/assets.ts`). */
export const ASSET_LIMITS: Record<EditorAssetKind, { maxBytes: number; types: string[] }> = {
  model: { maxBytes: 100 * MB, types: ["model/gltf-binary"] },
  image: {
    maxBytes: 25 * MB,
    types: ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"],
  },
};

export const IMAGE_ASSET_ACCEPT = ASSET_LIMITS.image.types.join(",");

const TYPE_BY_EXTENSION: Record<string, string> = {
  glb: "model/gltf-binary",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
};

export class AssetUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssetUploadError";
  }
}

export function assetContentType(file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return TYPE_BY_EXTENSION[ext] ?? file.type.toLowerCase();
}

export async function listProjectAssets(projectId: string): Promise<EditorAsset[]> {
  const q = new URLSearchParams({
    project_id: `eq.${projectId}`,
    status: "eq.ready",
    order: "created_at.asc",
    select: ASSET_COLUMNS,
  });
  const rows = await dataJson<AssetRow[]>(`assets?${q}`);
  return rows.map(assetFromRow);
}

export async function renameProjectAsset(assetId: string, name: string) {
  await dataJson<undefined>(`assets?id=eq.${encodeURIComponent(assetId)}`, {
    method: "PATCH",
    body: JSON.stringify({ name, updated_at: new Date().toISOString() }),
  });
}

export async function deleteProjectAsset(projectId: string, assetId: string) {
  await storageJson<{ ok: true }>(
    `projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(assetId)}`,
    { method: "DELETE" },
  );
}

type UploadUrlResponse =
  | { asset: AssetRow; existing: true }
  | { asset: AssetRow; upload: UploadTicket };

export async function requestAssetUpload(
  projectId: string,
  input: {
    kind: EditorAssetKind;
    filename: string;
    name: string;
    contentType: string;
    size: number;
    sha256: string | null;
    sceneId: string | null;
    width: number | null;
    height: number | null;
  },
) {
  return storageJson<UploadUrlResponse>(
    `projects/${encodeURIComponent(projectId)}/assets/upload-url`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

export async function commitAssetUpload(
  projectId: string,
  assetId: string,
  dims: { width: number | null; height: number | null },
) {
  const { asset } = await storageJson<{ asset: AssetRow }>(
    `projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(assetId)}/commit`,
    { method: "POST", body: JSON.stringify(dims) },
  );
  return asset;
}

export function formatAssetSize(bytes: number) {
  if (bytes >= MB) return `${(bytes / MB).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
