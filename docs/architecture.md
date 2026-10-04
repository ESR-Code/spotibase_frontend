# Architecture

Spotibase is a Next.js App Router app. Almost all product code is the client-side editor at `/projects/[id]/editor`. Editor state lives in Zustand while editing and is loaded from / saved to Postgres per project (scenes + project editor data), with media in R2 as project assets. The SaaS data plane is Neon Lakebase Postgres with Managed Better Auth; the tenant boundary is an **organization**.

## Layout

```
app/
  page.tsx                          # client session gate → /projects or /auth/sign-in
  layout.tsx                        # root fonts / metadata
  auth/                             # sign-in, disabled sign-up, forgot/reset password
  projects/                         # studio dashboard (orgs, folders, projects)
    [id]/                           # project detail; tabs registered in _components/project-detail/project-tabs.tsx
      editor/                       # Spotibase (`/projects/[id]/editor`)
        page.tsx → editor-page-client  # dynamic import, ssr: false
        layout.tsx                  # editor fonts + theme
  orgs/                             # legacy redirect → /projects
  editor/                           # editor UI modules; page.tsx redirects legacy `/editor`
    editor-theme.css
    _components/                    # editor UI (shell, viewport, drawers, actions)
  http_request_node_test/route.ts   # demo JSON for HTTP Request nodes
  subscribe_node_test/route.ts      # mutating JSON for Subscribe nodes
lib/editor/                         # domain: types, stores, engines, actions
lib/auth/                           # browser Neon Auth client (calls the Worker)
lib/api/                            # TanStack Query provider + Data API fetch helper
lib/projects/                       # folder/project Data API helpers + hooks
lib/db/                             # Drizzle: neon_auth introspect + public app schema
worker/                             # Cloudflare Worker API gateway (`cf`)
neon.ts                             # Neon IaC (Auth + Data API)
drizzle.config.ts                   # drizzle-kit (generate / migrate / pull / studio)
components/ui/                      # shadcn primitives (button, input, …)
scripts/copy-maplibre-workers.mjs   # postinstall → public/
public/                             # static assets + copied MapLibre workers
reference_editor_html/              # legacy HTML reference (not runtime)
```

`lib/editor/` modules:

| Folder | Role |
| --- | --- |
| `types/` | Domain types (`Scene`, `Hotspot`, action graph, layers, geo reference) |
| `state/` | Zustand stores |
| `scene-types/` | Immutable scene-type registry (engine, camera, which settings/tabs show) |
| `actions/` | Action-graph create/run/validate + node registry |
| `blocks/` | Hotspot modal block create/registry (non-UI) |
| `engine/` | PlayCanvas app, camera, picking, hotspots, model, effects |
| `geo/` | MapLibre init, styles, overlays, projection |
| `coords/` | ENU + 2-point / 3-point geo alignment |
| `forms/` | react-hook-form hooks + Zod schemas |
| `io/` | Subject import (GLB / image) and hotspot JSON export |
| `layers/` | Overlay id helpers and image blend |
| `theme/` | Editor tokens, shapes, category icons, preview CSS vars |
| `hooks/` | `usePlayCanvasEditor`, `useGeoMapEditor`, keyboard |
| `preview/` | Open / focus hotspot in Preview |
| `constants/` | Seed scene, defaults, demo hotspots |

UI mirrors that split: `app/editor/_components/{viewport,outliner,drawers,actions,blocks,dialogs,toolbar,ui}`.

## Backend and tenancy

Linked Neon project (`neon.ts`, `auth: true`). Credentials live in `.env.local` via `neon link` / `neon checkout` — never in git.

**Tenant = organization.** Identity and membership are Managed Better Auth tables in schema `neon_auth` (Neon owns DDL). Do not recreate them in `public`. Product tables `project_folders` and `projects` FK to `neon_auth.organization.id`.

| Concept | Table |
| --- | --- |
| users | `neon_auth.user` |
| organizations | `neon_auth.organization` |
| memberships | `neon_auth.member` (`role`: owner / admin / member) |
| invitations | `neon_auth.invitation` (`inviterId`, `expiresAt`, `status`) |
| folders | `public.project_folders` |
| projects | `public.projects` (+ `editor_data` JSONB, `editor_revision`) |
| scenes | `public.scenes` (lifted columns + `data` JSONB) |
| assets | `public.assets` (file metadata + `r2_key`) |

Drizzle introspects Auth tables into `lib/db/schema.ts`. Product tables live in `lib/db/app-schema.ts` and are migrated with `npm run db:generate` / `db:migrate` (do not migrate Auth tables). Refresh Auth types with `npm run db:pull`. Use `createDb()` from `lib/db/index.ts` on the **server only**. Org invitation emails stay off until an accept-invitation route exists. Do not use Drizzle as the login or browser CRUD path.

RLS on `project_folders` / `projects` / `scenes` / `assets` allows rows only when `public.is_org_member(organization_id)` is true (SECURITY DEFINER check against `neon_auth.member` + `auth.uid()`). Browser CRUD goes through `/gateway/data/*` (Worker → Neon Data API).

The browser calls same-origin `/gateway/*`. Next proxies that to the Worker (`WORKER_URL`, default `http://127.0.0.1:8787`) so the session cookie stays on the app origin. If the Worker is not running, `GET /gateway/auth/get-session` returns an empty session instead of a 500. The browser never sees Neon URLs or `DATABASE_URL`. `/auth/*` proxies Neon Auth. `/data/*` exchanges the session cookie for the user JWT and forwards to the Neon Data API (RLS is the authorization layer; `neon_auth` is not exposed). `/fn/*` is reserved for a future Neon Function and returns 501 until `NEON_FUNCTION_URL` is set. Run the Worker with `npm run dev:api` beside `npm run dev`, or both at once with `npm run dev:local` (local Worker + simulated R2; Auth, Data API, and Postgres are the linked cloud Neon branch).

### File storage (Cloudflare R2)

Private bucket `spotibase-assets`, bound to the Worker as `ASSETS`. Keys are tenant-scoped:

```
orgs/{orgId}/projects/{projectId}/thumbnails/{uuid}.webp
orgs/{orgId}/projects/{projectId}/assets/{assetId}.{ext}   # editor media (immutable)
```

Postgres stores the **R2 key, never a URL** (`projects.thumbnail_r2_key`, `assets.r2_key`). The browser derives `/gateway/files/<key>` (`lib/projects/storage.ts`, `lib/editor/assets/resolve.ts`).

Worker routes (`worker/src/storage.ts`, `worker/src/assets.ts`, shared helpers in `storage-common.ts`), all authorized by reading the project row with the user JWT under RLS:

| Route | Purpose |
| --- | --- |
| `POST /storage/projects/:id/thumbnail/upload-url` | Mint a key + 5-minute presigned S3 `PUT` (aws4fetch, R2 S3 token) |
| `POST /storage/projects/:id/thumbnail/commit` | `head` the object (WebP, ≤ 5 MB), PATCH the key via Data API, delete the previous object |
| `DELETE /storage/projects/:id/thumbnail` | Clear the key and delete the object |
| `POST /storage/projects/:id/assets/upload-url` | Validate kind / type / size, reserve a `pending` asset row (or return the existing one with the same `sha256`), mint the upload URL |
| `PUT /storage/projects/:id/assets/upload?key=` | Local dev only: write into the simulated bucket |
| `POST /storage/projects/:id/assets/:assetId/commit` | `head` the object, mark the row `ready` |
| `DELETE /storage/projects/:id/assets/:assetId` | Delete the row and the object |
| `DELETE /storage/projects/:id/assets` | Delete every asset object (project delete; rows cascade) |
| `GET /files/<key>` | Stream from R2 after checking membership; `private, immutable` cache |

Upload flow: browser crops/encodes 16:9 WebP → upload-url → `PUT` straight to R2 → commit. Bucket CORS (`worker/r2-cors.json`) allows `PUT` from the app origin. Deleting a project first clears its thumbnail (best-effort). Local dev: with `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` empty, `upload-url` returns a same-origin `PUT /gateway/storage/projects/:id/thumbnail/upload?key=…` and the Worker writes into the simulated bucket (plain `npm run dev:api`, no Cloudflare account needed; inspect with `e` in the dev terminal). With credentials set, uploads are presigned; use `npm run dev:api:r2` (remote `ASSETS` binding) so reads hit the same real bucket. Worker secrets: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`.

Auth UI: `/auth/sign-in`, `/auth/forgot-password`, `/auth/reset-password`, and a **disabled** `/auth/sign-up` (Neon email-password sign-up is also closed). Email verification is off until the rest of the product UI is ready. After login, `/projects` is the studio dashboard (org selector, folders, projects). `/orgs` redirects there. Session redirects are client-side.

### Editor persistence

```
EditorPageClient (ssr:false) → EditorProjectLoader
  loadEditorProject: projects(editor_data, editor_revision) + scenes + assets(ready)
  hydrateProject → scenes / live stores / general settings / assets store
  bindPersistedProject → dirty baseline
  EditorApp
Save (header button, Ctrl/Cmd+S) → serializeProject → POST /gateway/data/rpc/save_editor_project
```

- `lib/editor/persist/`: `schema.ts` (format version + Zod), `serialize.ts`, `hydrate.ts`, `api.ts`, `persist-store.ts` (dirty / save / conflict).
- `scenes` lifts `id` (editor uuid), `name`, `slug` (set on first save, never changes), `sort_order`, `type`, `thumbnail_asset_id`; `data` is the rest of `Scene` plus `schemaVersion`. `projects.editor_data` holds `primarySceneId`, `appStartActions`, `generalStyle`, `sceneExplorerEnabled`.
- `save_editor_project(project, expected_revision, editor_data, scenes)` is a `SECURITY INVOKER` plpgsql function (migration `0004`): one transaction upserts / deletes scenes, writes `editor_data` and `scene_count`, bumps `editor_revision`. A stale revision raises `PT409` / hint `revision_conflict`.
- Dirty tracking: authored-store subscriptions trigger a debounced fingerprint (`serializeProject` JSON) against the last loaded / saved baseline.
- Media: `lib/editor/assets/` (`useAssetsStore` project library, `uploadAsset`, `resolveAssetSrc`, `collectAssetRefs`). Asset Library dialog: project menu → Assets.

## Runtime shape

```
EditorPageClient (ssr:false)
  EditorProjectLoader
  EditorApp
    EditorShell
      ViewportFrame ── PlayCanvas (model/image) or MapLibre (geo)
      HotspotOutliner / Layers / Subject
      property + settings + legend + scene-explorer drawers
      Scenes / Georeference / Actions / Preview dialogs
```

`ViewportFrame` keeps the PlayCanvas canvas mounted (hidden) on geo scenes and dynamically loads `GeoMapViewport`. Subject import is a `editor:import-subject` window event handled by the PlayCanvas hook.

## Scene types

`Scene.type` is set at creation and does not change. `lib/editor/scene-types/registry.ts` is the single source for:

- engine: `playcanvas` (`model`, `image`) vs `map` (`geo`)
- camera: orbit / pan-zoom / globe
- which settings sections and outliner tabs appear
- accepted subject file extensions

## State

**Project record:** `useScenesStore` holds `scenes[]`, `activeSceneId`, and project-wide `appStartActions`.

**Live stores** (active scene only): `editor-store` (hotspots, mode, preview), `model-store`, `settings-store`, `environment-store`, `effects-store`, `geo-store`, `layers-store`, plus UI/session stores.

On scene switch / add, `scenes-store` snapshots live stores into the outgoing `Scene` and hydrates the incoming one (`hotspots`, model, settings, environment, effects, geo, layers, `geoReference`). New per-scene fields must join that path. Scene identity (`name`, `slug`, `description`, `thumbnailUrl`) lives on the `Scene` record and is not hydrated into a live store. The subject reference (`model.subjectAssetId`) is part of the model snapshot.

**Project library:** `useAssetsStore` (project id, ready assets, pending upload count). Project-level; not snapshotted per scene. `useProjectPersistStore` holds the DB binding (revision, dirty, save status).

**Preview overlays** (cleared when leaving Preview): `preview-appearance-store`, `preview-visibility-store`, `preview-spawned-hotspots-store`, `preview-mesh-highlight-store`, `preview-post-message-test-store`. Authored hotspots stay unchanged.

**Editor pose preview** (`editor-anim-preview-store`) is session chrome for the viewport clip transport. Not snapshotted; bind pose is restored on Preview toggle, scene switch, and subject replace.

The Post Message receive tester HUD (`PostMessageReceiveTestSuite`) is editor chrome: opt-in keys live in the session store, not on the action node. It injects `{ event, data }` to the same window so live receive listeners run.

**Project-wide chrome:** `general-settings-store` (Preview style tokens + `sceneExplorerEnabled`). Not per-scene. Legend enable stays on per-scene `EditorSettings`.

Hotspot vs layer selection is exclusive (`lib/editor/state/exclusive-selection.ts`).

## Action graphs

Graphs are `{ nodes, edges }` owned by:

| Owner | Id convention |
| --- | --- |
| Hotspot click | hotspot `id` (> 0) |
| App Start | `APP_START_OWNER_ID` (−1) |
| Scene Start | `SCENE_START_OWNER_ID` (−2) |
| Spawn click template (editor-only) | `SPAWN_CLICK_LANE_OWNER_ID` (−3), not persisted |
| Legend category | `LEGEND_OWNER_ID` (−4); lane only while legend is enabled |
| Action button (hotspot content) | `CONTENT_BUTTON_OWNER_BASE` (−5000) down to just above −10000 |
| Custom bottom-menu button | `ownerId ≤ MENU_BUTTON_OWNER_BASE` (−10000) |

Runtime metadata: `lib/editor/actions/registry.ts` (`validate` / `run`, optional `sceneTypes`). Canvas UI: `action-node-registry.tsx`. Allowed node types differ by owner (`action-owners.ts`). Runner: `run-action-graph.ts`. The Legend trigger is a scene-scoped graph (`Scene.legendActions`); Preview category changes walk that trigger’s matching output (`lib/editor/actions/legend-category.ts`).

XYFlow edits the graph; `flow-adapter.ts` maps domain nodes ↔ flow nodes. Named frames on the canvas are `ActionFence`s (scene-scoped).

`{{field}}` interpolation (`interpolate-fields.ts`) pulls from HTTP / Subscribe / Post Message / For Each item scope.

## Rendering

- **PlayCanvas:** `use-playcanvas-editor.ts` wires camera, picking, hotspots, model, effects, mesh highlight, and GLB clip playback. Default box when no GLB is imported. Image scenes use the same engine with pan/zoom. On geo scenes the app stays mounted with `autoRender` off.
- **MapLibre:** `use-geo-map-editor.ts` + `geo/`. Markers, image/shape overlays, freehand draw, Nominatim search. Workers are copied to `public/` and served as JavaScript (`next.config.ts`).

## Geo alignment

Model scenes: 3-point. Image scenes: 2-point. Control points are the source of truth; `GeoReference.transform` is a derived local→ENU matrix (`coords/`). Used when spawning lat/lon hotspots onto an aligned PlayCanvas scene.

## Forms and UI

Settings drawers use react-hook-form + Zod (`lib/editor/forms/`). Editor chrome is custom (`editor-theme.css`, glass panels). `components/ui/` is shadcn (New York). Toasts: `lib/editor/toast.ts` + `EditorToaster` (bottom-right, editor glass), not a third-party toast library.
