export const OVERLAY_MAX_BYTES = 8 * 1024 * 1024;
export const OVERLAY_ACCEPT = "image/png,image/jpeg,image/webp";

export type OverlayImageFile = {
  dataUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  name: string;
};

function displayNameFromFile(file: File): string {
  return file.name.replace(/\.[^.]+$/, "").trim() || "Overlay";
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.readAsDataURL(file);
  });
}

function readNaturalSize(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () =>
      resolve({
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
      });
    image.onerror = () => reject(new Error("Could not decode image"));
    image.src = dataUrl;
  });
}

export async function readOverlayImageFile(file: File): Promise<OverlayImageFile> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose a PNG, JPG, or WebP image");
  }
  if (file.size > OVERLAY_MAX_BYTES) {
    throw new Error("Overlay image must be under 8 MB");
  }
  const dataUrl = await readDataUrl(file);
  const size = await readNaturalSize(dataUrl);
  if (size.width < 1 || size.height < 1) {
    throw new Error("Image has no dimensions");
  }
  return {
    dataUrl,
    naturalWidth: size.width,
    naturalHeight: size.height,
    name: displayNameFromFile(file),
  };
}
