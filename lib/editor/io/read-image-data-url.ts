export const HOTSPOT_IMAGE_MAX_BYTES = 2.5 * 1024 * 1024;
export const HOTSPOT_IMAGE_ACCEPT =
  "image/png,image/jpeg,image/webp,image/svg+xml,image/gif";

export class ImageFileReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageFileReadError";
  }
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.readAsDataURL(file);
  });
}

export async function readImageFileAsDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new ImageFileReadError("Please choose an image file");
  }
  if (file.size > HOTSPOT_IMAGE_MAX_BYTES) {
    throw new ImageFileReadError("Image must be under 2.5 MB");
  }
  return readDataUrl(file);
}

export async function readImageFilesAsDataUrls(
  files: FileList | File[],
): Promise<{ dataUrl: string }[]> {
  const list = Array.from(files);
  const results: { dataUrl: string }[] = [];
  for (const file of list) {
    results.push({ dataUrl: await readImageFileAsDataUrl(file) });
  }
  return results;
}
