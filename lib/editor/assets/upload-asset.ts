import {
  ASSET_LIMITS,
  AssetUploadError,
  assetContentType,
  commitAssetUpload,
  formatAssetSize,
  requestAssetUpload,
} from "@/lib/editor/assets/api";
import {
  requireEditorProjectId,
  useAssetsStore,
} from "@/lib/editor/assets/assets-store";
import {
  assetFromRow,
  type EditorAsset,
  type EditorAssetKind,
} from "@/lib/editor/assets/types";

async function sha256Hex(file: Blob): Promise<string | null> {
  if (!globalThis.crypto?.subtle) return null;
  try {
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return Array.from(new Uint8Array(digest), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
  } catch {
    return null;
  }
}

async function imageSize(file: Blob, contentType: string) {
  if (!contentType.startsWith("image/") || contentType === "image/svg+xml") {
    return { width: null, height: null };
  }
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return { width: null, height: null };
  }
}

/**
 * Uploads a file into the project library (presigned PUT + commit) and
 * registers it in `useAssetsStore`. Identical bytes already in the project
 * return the existing asset instead of a duplicate.
 */
export async function uploadAsset(
  file: File,
  options: { kind: EditorAssetKind; sceneId?: string | null; name?: string },
): Promise<EditorAsset> {
  const projectId = requireEditorProjectId();
  const contentType = assetContentType(file);
  const limits = ASSET_LIMITS[options.kind];
  if (!limits.types.includes(contentType)) {
    throw new AssetUploadError("This file type is not supported.");
  }
  if (file.size > limits.maxBytes) {
    throw new AssetUploadError(
      `File must be ${formatAssetSize(limits.maxBytes)} or smaller.`,
    );
  }

  const store = useAssetsStore.getState();
  store.beginUpload();
  try {
    return await uploadValidated(file, projectId, contentType, options);
  } finally {
    useAssetsStore.getState().endUpload();
  }
}

async function uploadValidated(
  file: File,
  projectId: string,
  contentType: string,
  options: { kind: EditorAssetKind; sceneId?: string | null; name?: string },
): Promise<EditorAsset> {
  const [sha256, dims] = await Promise.all([
    sha256Hex(file),
    imageSize(file, contentType),
  ]);

  const ticket = await requestAssetUpload(projectId, {
    kind: options.kind,
    filename: file.name,
    name: options.name ?? file.name,
    contentType,
    size: file.size,
    sha256,
    sceneId: options.sceneId ?? null,
    ...dims,
  });

  let row = ticket.asset;
  if ("upload" in ticket) {
    const put = await fetch(ticket.upload.url, {
      method: ticket.upload.method,
      headers: ticket.upload.headers,
      body: file,
    });
    if (!put.ok) throw new AssetUploadError(`Upload failed (${put.status}).`);
    row = await commitAssetUpload(projectId, row.id, dims);
  }

  const asset = assetFromRow(row);
  useAssetsStore.getState().upsertAsset(asset);
  return asset;
}
