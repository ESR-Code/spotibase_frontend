import { viewerRuntime } from "@/lib/editor/runtime";
import { useAssetsStore } from "@/lib/editor/assets/assets-store";
import {
  assetIdFromRef,
  isAssetRef,
  type EditorAsset,
} from "@/lib/editor/assets/types";

/**
 * Same-origin URL for an asset's bytes. The editor reads through the
 * session-checked `/files` route; the public viewer reads the published copy
 * through `/public/files` (plus the unlock token for protected projects).
 */
export function assetFileUrl(asset: Pick<EditorAsset, "r2Key">): string {
  const viewer = viewerRuntime();
  if (!viewer) return `/gateway/files/${asset.r2Key}`;
  const token = viewer.token ? `?vt=${encodeURIComponent(viewer.token)}` : "";
  return `/gateway/public/files/${asset.r2Key}${token}`;
}

/**
 * Turns an authored image/file value into something `<img src>` / loaders
 * accept. `asset:<id>` resolves through the project library (empty string
 * when the asset is missing); any other value passes through unchanged.
 */
export function resolveAssetSrc(value: string | null | undefined): string {
  if (!value) return "";
  const id = assetIdFromRef(value);
  if (!id) return value;
  const asset = useAssetsStore.getState().assets[id];
  return asset ? assetFileUrl(asset) : "";
}

/** True when `value` references an asset that is not in the project library. */
export function isMissingAssetRef(value: string | null | undefined): boolean {
  const id = assetIdFromRef(value);
  return id !== null && !useAssetsStore.getState().assets[id];
}

/** Reactive `resolveAssetSrc` for components (re-renders on library changes). */
export function useAssetSrc(value: string | null | undefined): string {
  return useAssetsStore((state) => {
    if (!value) return "";
    if (!isAssetRef(value)) return value;
    const asset = state.assets[assetIdFromRef(value) ?? ""];
    return asset ? assetFileUrl(asset) : "";
  });
}

export function useIsMissingAssetRef(value: string | null | undefined): boolean {
  return useAssetsStore((state) => {
    const id = assetIdFromRef(value);
    return id !== null && !state.assets[id];
  });
}
