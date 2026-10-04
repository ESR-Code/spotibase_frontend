import { assetRef } from "@/lib/editor/assets/types";
import { resolveAssetSrc } from "@/lib/editor/assets/resolve";
import type { SceneTypeId } from "@/lib/editor/types/scene-type";

export type CachedSubject = {
  kind: SceneTypeId;
  fileName: string;
  /** Original file (or a copy). Re-read on restore so the bytes stay valid. */
  blob: Blob;
  /** Library asset of these bytes; null while the upload is still running. */
  assetId: string | null;
};

const cache = new Map<string, CachedSubject>();
const fetched = new Map<string, Promise<Blob>>();

export const sceneSubjectCache = {
  get(sceneId: string): CachedSubject | undefined {
    return cache.get(sceneId);
  },
  set(sceneId: string, value: CachedSubject): void {
    cache.set(sceneId, value);
  },
  setAssetId(sceneId: string, assetId: string): void {
    const entry = cache.get(sceneId);
    if (entry) cache.set(sceneId, { ...entry, assetId });
  },
  delete(sceneId: string): void {
    cache.delete(sceneId);
  },
  clear(): void {
    cache.clear();
    fetched.clear();
  },
};

/** Downloads a subject asset once per session (`/gateway/files/...`). */
export function fetchSubjectBlob(assetId: string): Promise<Blob> {
  const existing = fetched.get(assetId);
  if (existing) return existing;
  const url = resolveAssetSrc(assetRef(assetId));
  const promise = (async () => {
    if (!url) throw new Error("Subject asset is missing from the library");
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) throw new Error(`Subject download failed (${response.status})`);
    return response.blob();
  })();
  fetched.set(assetId, promise);
  promise.catch(() => fetched.delete(assetId));
  return promise;
}

/** @deprecated Use sceneSubjectCache */
export const sceneModelCache = sceneSubjectCache;
