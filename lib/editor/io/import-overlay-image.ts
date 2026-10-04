import { assetRef, uploadAsset } from "@/lib/editor/assets";

export const OVERLAY_MAX_BYTES = 25 * 1024 * 1024;
export const OVERLAY_ACCEPT = "image/png,image/jpeg,image/webp";

export type OverlayImageFile = {
  /** `asset:<id>` of the uploaded overlay. */
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  name: string;
};

function displayNameFromFile(file: File): string {
  return file.name.replace(/\.[^.]+$/, "").trim() || "Overlay";
}

/** Validates, uploads into the project library, and returns the layer source. */
export async function importOverlayImageFile(
  file: File,
  sceneId: string | null,
): Promise<OverlayImageFile> {
  if (!OVERLAY_ACCEPT.split(",").includes(file.type)) {
    throw new Error("Please choose a PNG, JPG, or WebP image");
  }
  if (file.size > OVERLAY_MAX_BYTES) {
    throw new Error("Overlay image must be under 25 MB");
  }
  const asset = await uploadAsset(file, { kind: "image", sceneId });
  if (!asset.width || !asset.height) {
    throw new Error("Image has no dimensions");
  }
  return {
    src: assetRef(asset.id),
    naturalWidth: asset.width,
    naturalHeight: asset.height,
    name: displayNameFromFile(file),
  };
}
