export type EditorAssetKind = "model" | "image";

/** A committed project asset (`public.assets` row, `status = ready`). */
export type EditorAsset = {
  id: string;
  kind: EditorAssetKind;
  name: string;
  filename: string;
  contentType: string;
  size: number;
  width: number | null;
  height: number | null;
  r2Key: string;
  sceneId: string | null;
  createdAt: string;
};

/** Snake-case row as returned by the Data API / storage Worker. */
export type AssetRow = {
  id: string;
  kind: EditorAssetKind;
  status: "pending" | "ready";
  name: string;
  filename: string;
  content_type: string;
  size: number;
  width: number | null;
  height: number | null;
  r2_key: string;
  scene_id: string | null;
  created_at: string;
};

export function assetFromRow(row: AssetRow): EditorAsset {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    filename: row.filename,
    contentType: row.content_type,
    size: Number(row.size),
    width: row.width,
    height: row.height,
    r2Key: row.r2_key,
    sceneId: row.scene_id,
    createdAt: row.created_at,
  };
}

/**
 * Authored image / file fields stay strings. A value of `asset:<uuid>` points
 * at a project asset; anything else (URL, `{{token}}`, legacy data URL) is
 * used as-is.
 */
export const ASSET_REF_PREFIX = "asset:";

export function assetRef(assetId: string): string {
  return `${ASSET_REF_PREFIX}${assetId}`;
}

export function isAssetRef(value: unknown): boolean {
  return typeof value === "string" && value.startsWith(ASSET_REF_PREFIX);
}

export function assetIdFromRef(value: unknown): string | null {
  return typeof value === "string" && value.startsWith(ASSET_REF_PREFIX)
    ? value.slice(ASSET_REF_PREFIX.length)
    : null;
}
