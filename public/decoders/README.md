# Model decoders

Self-hosted decoders PlayCanvas uses to load compressed GLBs (configured in
`lib/editor/engine/model-decoders.ts`). Copied unmodified from three.js r170
(`three@0.170.0/examples/jsm/libs/`).

| Folder   | Files                                         | Decodes                                   | License    |
| -------- | --------------------------------------------- | ----------------------------------------- | ---------- |
| `draco/` | `draco_wasm_wrapper.js`, `draco_decoder.wasm` | `KHR_draco_mesh_compression` meshes       | Apache-2.0 (Google Draco) |
| `basis/` | `basis_transcoder.js`, `basis_transcoder.wasm` | `KHR_texture_basisu` (KTX2) textures     | Apache-2.0 (Binomial Basis Universal) |

Meshopt (`EXT_meshopt_compression`) is decoded from the `meshoptimizer` npm
package instead (`lib/editor/engine/glb-meshopt.ts`).
