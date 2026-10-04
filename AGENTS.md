

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.



# Spotibase — agent instructions

This is a Next.js 16 / React 19 app. The product is **Spotibase** (“3D Hotspot Studio”) at `/projects/[id]/editor`: a client-side editor for placing hotspots on 3D models, 2D images, and geo maps, then wiring Preview behavior with action graphs.

## Every coding task

1. Read this file and the relevant docs in `docs/` before implementing anything.
2. Identify the feature/module and inspect only the source files needed. Do not scan the whole repository.
3. Search for existing components, utilities, APIs, and patterns before creating new ones.
4. Follow `docs/architecture.md` and `docs/decisions.md`.
5. After a significant feature, architecture change, or important technical decision, update the matching file in `docs/` (and this file if the workflow or conventions changed).
6. Do not document trivial code changes or add unnecessary docs. Keep docs concise and current.
7. Never change application code only to create or update documentation unless the user explicitly asks.



## Where to look


| Task                                      | Start here                                                                          |
| ----------------------------------------- | ----------------------------------------------------------------------------------- |
| Scene types, engines, settings visibility | `lib/editor/scene-types/registry.ts`, `docs/architecture.md`                        |
| Action nodes (runtime)                    | `lib/editor/actions/registry.ts`, `lib/editor/types/hotspot-action.ts`              |
| Action nodes (UI)                         | `app/editor/_components/actions/action-node-registry.tsx`                           |
| Hotspot content blocks                    | `lib/editor/blocks/registry.ts`, `app/editor/_components/blocks/block-registry.tsx` |
| Project / scene state                     | `lib/editor/state/scenes-store.ts`, `lib/editor/types/scene.ts`                     |
| Live editor / preview overlay state       | `lib/editor/state/`                                                                 |
| PlayCanvas viewport                       | `lib/editor/hooks/use-playcanvas-editor.ts`, `lib/editor/engine/`                   |
| MapLibre viewport                         | `lib/editor/hooks/use-geo-map-editor.ts`, `lib/editor/geo/`                         |
| Geo alignment                             | `lib/editor/coords/`, `lib/editor/types/geo-reference.ts`                           |
| Neon Auth / projects / Drizzle            | `worker/`, `lib/auth/`, `app/auth/`, `app/projects/`, `lib/projects/`, `lib/db/`, `docs/architecture.md` |
| R2 file storage (uploads / reads)         | `worker/src/storage.ts`, `lib/projects/storage.ts`, `docs/architecture.md` |
| Feature status                            | `docs/features.md`                                                                  |




## Conventions

- **React, not Angular.** Standalone editor UI lives under `app/editor/_components/`. Domain logic lives under `lib/editor/`. Do not introduce NgModules, signals, or Angular control flow.
- **Client-only editor.** The editor tree is loaded with `ssr: false`. Keep PlayCanvas / MapLibre / Zustand editor code on the client.
- **Extend registries.** New scene types, action nodes, and blocks go through the existing registries plus types. Do not sprinkle one-off `if (type === …)` checks when the registry already gates availability.
- **Reuse before inventing.** Editor chrome uses `app/editor/_components/ui/` (`EditorButton`, `GlassPanel`, `FieldLabel`, …). Shared primitives live in `components/ui/` (shadcn). Match existing Zustand store and react-hook-form + Zod patterns.
- **Preview vs authored data.** Preview-only visibility, appearance, spawned hotspots, and mesh highlights belong in the `preview-`* stores. Do not mutate authored hotspots for temporary Preview effects.
- **Scene switch.** Changing scenes snapshots the live stores into the outgoing `Scene`, then hydrates the incoming one. If you add per-scene state, include it in that snapshot/hydrate path.
- **Path alias.** Import via `@/` (see `tsconfig.json`).
- **Server-only DB.** `lib/db/` and `DATABASE_URL` stay off Client Components and off the Worker. The editor tree remains `ssr: false`. The browser calls same-origin `/gateway/*`; Next proxies that to the Worker.
- **Files live in R2.** Store R2 keys (not URLs) in Postgres under `orgs/{orgId}/projects/{projectId}/…`. Upload via Worker-presigned `PUT` + commit; read via `/gateway/files/<key>`.
- **Deprecated aliases.** Prefer `import-subject`, `scene-subject-cache`, and `replaceFromFile`. Do not add new callers of the deprecated GLB/model-cache names.



## Docs

- `docs/architecture.md` — structure and relationships
- `docs/features.md` — implemented / partial / planned
- `docs/decisions.md` — architectural and technical decisions

