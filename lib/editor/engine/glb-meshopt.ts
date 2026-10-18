/**
 * PlayCanvas parses Draco and KTX2 itself (see `configureModelDecoders`), but not
 * meshopt (gltfpack output). This rewrites a meshopt-compressed GLB into a plain
 * GLB: every compressed buffer view is decoded and all views are packed into one
 * binary buffer.
 */

const GLB_MAGIC = 0x46546c67; // "glTF"
const CHUNK_JSON = 0x4e4f534a;
const CHUNK_BIN = 0x004e4942;
const MESHOPT_EXTENSIONS = ["EXT_meshopt_compression", "KHR_meshopt_compression"];

type MeshoptViewExtension = {
  buffer: number;
  byteOffset?: number;
  byteLength: number;
  byteStride: number;
  count: number;
  mode: string;
  filter?: string;
};

type GltfBufferView = {
  buffer: number;
  byteOffset?: number;
  byteLength: number;
  byteStride?: number;
  extensions?: Record<string, unknown>;
};

type GltfJson = {
  buffers?: Array<{ byteLength: number; uri?: string; extensions?: Record<string, unknown> }>;
  bufferViews?: GltfBufferView[];
  extensionsUsed?: string[];
  extensionsRequired?: string[];
};

function readGlb(buffer: ArrayBuffer): { json: GltfJson; bin: Uint8Array | null } | null {
  const view = new DataView(buffer);
  if (buffer.byteLength < 20 || view.getUint32(0, true) !== GLB_MAGIC) return null;
  let offset = 12;
  let json: GltfJson | null = null;
  let bin: Uint8Array | null = null;
  while (offset + 8 <= buffer.byteLength) {
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    const start = offset + 8;
    if (type === CHUNK_JSON) {
      json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, start, length)));
    } else if (type === CHUNK_BIN && !bin) {
      bin = new Uint8Array(buffer, start, length);
    }
    offset = start + length;
  }
  return json ? { json, bin } : null;
}

function writeGlb(json: GltfJson, bin: Uint8Array): ArrayBuffer {
  const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const jsonLength = align4(jsonBytes.length);
  const binLength = align4(bin.length);
  const total = 12 + 8 + jsonLength + 8 + binLength;
  const out = new ArrayBuffer(total);
  const view = new DataView(out);
  const bytes = new Uint8Array(out);

  view.setUint32(0, GLB_MAGIC, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);

  view.setUint32(12, jsonLength, true);
  view.setUint32(16, CHUNK_JSON, true);
  bytes.set(jsonBytes, 20);
  bytes.fill(0x20, 20 + jsonBytes.length, 20 + jsonLength); // JSON pads with spaces

  const binStart = 20 + jsonLength;
  view.setUint32(binStart, binLength, true);
  view.setUint32(binStart + 4, CHUNK_BIN, true);
  bytes.set(bin, binStart + 8);
  return out;
}

function align4(n: number) {
  return (n + 3) & ~3;
}

function bufferBytes(json: GltfJson, bin: Uint8Array | null, index: number): Uint8Array {
  const buffer = json.buffers?.[index];
  if (!buffer) throw new Error(`GLB references missing buffer ${index}`);
  if (!buffer.uri) {
    if (!bin) throw new Error("GLB has no binary chunk");
    return bin;
  }
  const match = /^data:[^;]*;base64,(.*)$/.exec(buffer.uri);
  if (!match) {
    throw new Error("GLB references an external buffer file, which can't be imported");
  }
  return Uint8Array.from(atob(match[1]!), (c) => c.charCodeAt(0));
}

function meshoptExtension(view: GltfBufferView): MeshoptViewExtension | null {
  for (const name of MESHOPT_EXTENSIONS) {
    const ext = view.extensions?.[name];
    if (ext) return ext as MeshoptViewExtension;
  }
  return null;
}

/** True when the GLB declares meshopt compression. */
export function glbUsesMeshopt(buffer: ArrayBuffer): boolean {
  const glb = readGlb(buffer);
  return Boolean(glb?.json.extensionsUsed?.some((name) => MESHOPT_EXTENSIONS.includes(name)));
}

/** Decode meshopt buffer views. Returns the input untouched when nothing is compressed. */
export async function decodeMeshoptGlb(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  const glb = readGlb(buffer);
  if (!glb) return buffer;
  const { json, bin } = glb;
  if (!json.extensionsUsed?.some((name) => MESHOPT_EXTENSIONS.includes(name))) {
    return buffer;
  }

  const { MeshoptDecoder } = await import("meshoptimizer/decoder");
  await MeshoptDecoder.ready;

  const views = json.bufferViews ?? [];
  const parts: Uint8Array[] = [];
  for (const view of views) {
    const ext = meshoptExtension(view);
    if (ext) {
      const source = bufferBytes(json, bin, ext.buffer).subarray(
        ext.byteOffset ?? 0,
        (ext.byteOffset ?? 0) + ext.byteLength,
      );
      const target = new Uint8Array(ext.count * ext.byteStride);
      MeshoptDecoder.decodeGltfBuffer(
        target,
        ext.count,
        ext.byteStride,
        source,
        ext.mode,
        ext.filter,
      );
      parts.push(target);
    } else {
      const start = view.byteOffset ?? 0;
      parts.push(bufferBytes(json, bin, view.buffer).subarray(start, start + view.byteLength));
    }
  }

  // Pack every view into one buffer (4-byte aligned, as glTF requires).
  let total = 0;
  const offsets = parts.map((part) => {
    const offset = total;
    total = align4(total + part.length);
    return offset;
  });
  const packed = new Uint8Array(total);
  views.forEach((view, i) => {
    const part = parts[i]!;
    packed.set(part, offsets[i]!);
    view.buffer = 0;
    view.byteOffset = offsets[i]!;
    view.byteLength = part.length;
    if (view.extensions) {
      for (const name of MESHOPT_EXTENSIONS) delete view.extensions[name];
      if (Object.keys(view.extensions).length === 0) delete view.extensions;
    }
  });

  json.buffers = [{ byteLength: total }];
  const strip = (list?: string[]) =>
    list?.filter((name) => !MESHOPT_EXTENSIONS.includes(name));
  json.extensionsUsed = strip(json.extensionsUsed);
  json.extensionsRequired = strip(json.extensionsRequired);
  if (json.extensionsRequired?.length === 0) delete json.extensionsRequired;

  return writeGlb(json, packed);
}
