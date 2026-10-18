import type * as pc from "playcanvas";

let configured = false;

/**
 * Point PlayCanvas at the self-hosted decoders (`public/decoders/`, see the README
 * there) so compressed GLBs load: Draco meshes and KTX2 / Basis textures. Workers
 * start lazily, on the first file that needs them. Meshopt is handled separately
 * by `decodeMeshoptGlb`.
 */
export function configureModelDecoders(pcModule: typeof pc) {
  if (configured || typeof window === "undefined") return;
  configured = true;
  const base = `${window.location.origin}/decoders`;
  pcModule.WasmModule.setConfig("DracoDecoderModule", {
    glueUrl: `${base}/draco/draco_wasm_wrapper.js`,
    wasmUrl: `${base}/draco/draco_decoder.wasm`,
    numWorkers: 2,
  });
  pcModule.WasmModule.setConfig("BASIS", {
    glueUrl: `${base}/basis/basis_transcoder.js`,
    wasmUrl: `${base}/basis/basis_transcoder.wasm`,
    numWorkers: 2,
  });
}
