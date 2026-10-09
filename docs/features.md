# Features

Status as of the current codebase. “Partial” means code exists but the feature is incomplete, unwired, or session-only.

## Implemented

### Editor shell

- `/projects/[id]/editor` client app: header, mode toolbar (select / add / preview), outliner, viewport HUD, drawers, dialogs. Legacy `/editor` (and `/editor?project=<id>`) redirects here.
- Editor deletes (hotspot, block, action, scene, layer, asset, and the other trash actions) ask “Are you sure you want to delete this …?” before they run. Same dialog for the Delete / Backspace key.
- Keyboard: `V` select, `A` add, `P` preview, `Escape` / `Delete` for selection (ignored in text fields).
- Loading overlay, engine error banner, scene-transition splash.
- Model scenes with GLB clips: viewport clip transport (play / pause / scrub / reset) so authors can freeze a pose in Select/Add. Hidden in Preview; does not run the action graph.

### Scenes

- Multiple scenes; one primary. Types: **3D Model** (orbit + GLB), **2D Image** (pan/zoom + PNG/JPG/WebP), **Geo map** (MapLibre globe/flat).
- Type is fixed at creation. Settings sections and outliner tabs follow the scene-type registry.
- Subject import via file picker or drag-drop (`import-subject`). Scene subject cache when switching.
- Optional scene description (create form + Scene Settings) and thumbnail upload (Scene Settings). Empty description is omitted from lists, not shown as a placeholder.
- Scene settings: name / description / thumbnail, camera limits, grid, logo, marker dialog presentation (modal / drawer / infobox, optional drawer inset), legend, custom Preview bottom-menu buttons.
- Environment + lighting (PlayCanvas). SSAO effects (model scenes).
- Geo start pin, zoom, map style, globe vs flat mercator. Nominatim place search.



### SaaS data plane

- Neon Managed Better Auth on the linked project; Organization plugin enabled (`owner` / `admin` / `member`). Invitation emails off until an accept route exists.
- Drizzle types for `neon_auth` (`user`, `organization`, `member`, `invitation`, …) in `lib/db/`. Drizzle is not the request path for login or browser CRUD.
- Cloudflare Worker gateway: `/auth` → Neon Auth, `/data` → Neon Data API (user JWT + RLS), `/fn` → 501 until a Neon Function URL is set, `/storage` + `/files` → R2 (presigned uploads, authorized streaming reads, editor assets). Rate limits on auth writes, `/data`, and `/storage`.
- Auth UI: sign-in, forgot password, reset password. Sign-up form exists but is disabled (Neon config `disable-sign-up` + no submit). Email verification is off.
- `/projects` studio dashboard (client-only): org create/switch, folder CRUD (name + color), project CRUD (name, description, move between folders), search (⌘K / Ctrl K), sort, tabs (All / Recent / In Folders / Root), grid/list view, workspace overview. Animated dialogs (bottom sheet on mobile), responsive layout.
- `/projects/[id]` project detail (client-only): breadcrumb, hero (thumbnail, title, folder · org, description, "Open in Studio Editor" CTA → `/projects/[id]/editor`), URL-synced tabs (`?tab=details|analytics|settings`). Details shows metadata (dates, scenes, library size, asset kind counts, copyable id). Library stats come from `project_asset_stats` (kind counts + total bytes; no asset rows). Settings edits name / description / folder, uploads / removes the project thumbnail (drag-and-drop or browse; cropped to 16:9 WebP, stored in R2, shown on cards and hero), and deletes the project. **Partial:** Analytics is visual-only sample data seeded from the project id (`app/projects/_lib/analytics-preview.ts`).

### Editor persistence and assets

- `/projects/[id]/editor` loads the project's scenes, project-wide editor data, and asset library from Postgres; a project with no scenes starts from the seed scene. Header Save button (Saved / Save / Saving / Uploading / Conflict), Ctrl/Cmd+S, unsaved-changes warning on unload. Stale saves are rejected (revision conflict → reload).
- Project asset library (project menu → Assets): search, filter by kind, rename, delete (blocked while referenced, with usage list), missing-asset report. Image fields (marker image, header image, image blocks, logo, scene thumbnail) upload into the library or pick from it; geo image overlays and 2D/3D subjects are library assets too. Identical files are deduped. Opening the editor and a successful save sweep unreferenced ready assets (`POST /storage/projects/:id/assets/gc`). Pending uploads younger than 15 minutes stay. Referenced files stay.
- `/` sends signed-in users to `/projects` and everyone else to `/auth/sign-in` (client session check). `/orgs` redirects to `/projects`.



### Hotspots

- Place, select, drag, duplicate, delete (confirmation dialog). Types, colors, styles (dot / number / icon / image / hidden), shapes (circle / square / rounded / diamond / pin), pulse, wick, enable flag.
- 2D/3D: click a marker to open the Hotspot Editor; drag repositions without opening it.
- Per-hotspot custom camera pose. Category + legend name.
- Content blocks: heading, text, link, image (upload or URL / token; optional per-slide caption; 2+ images become a Preview carousel), video (YouTube / Vimeo embed), action button (icon + label + optional italic description; Preview accent). Token fields can insert HTTP / Post Message / For Each paths.
- Preview: hover tooltip, select label, open presentation, legend filter.



### Layers (geo)

- Image overlays (opacity, edge blend, geo pose).
- Shape overlays: square, triangle, circle, freehand ring. Draw mode on the map.
- Outliner layers tab: visibility, lock, reorder, exclusive selection vs hotspots.



### Georeference

- Align a model (3-point) or image (2-point) scene to a Geo Map scene. Viewport pick banners/markers, residual validation, stored `GeoReference`.



### Action graphs

- Canvases: hotspot click, App Start, Scene Start, Legend (when enabled), custom menu buttons, hotspot Action buttons, Spawn template + nested click graph.
- Adding nodes: **Add action** button, double-click or right-click the canvas, or the `+` beside an open output. New nodes auto-connect after the selected node, else the lane's last open-ended node, else the trigger (never replacing an existing edge; skipped for multi-output nodes like Switch / Open Modal / toggle + Legend triggers). The menu shows the target lane and stays inside the canvas.
- Undo: deleting actions, connections or fences on the canvas is immediate with an Undo toast; add, paste and connect are recorded too. History is per canvas scope (`lib/editor/history/`). Undo / Redo buttons sit beside **Add action**. Shortcuts (Ctrl/⌘, ignored while typing; only the top-most canvas reacts): Z undo, Shift+Z / Y redo, C copy, V paste (near the selected node, else the lane at view centre), D duplicate selected actions.
- Nodes: Open Modal, Go To Scene, Go To Hotspot, Open URL, Post Message (send/receive), HTTP Request, Subscribe, Enable/Disable, Enable/Disable Mesh, Highlight Mesh, Animation, Change Color / Icon / Number & Title, For Each, Spawn Hotspot, Switch, Wait.
- Mesh nodes and Animation only on `model` scenes. Animation plays a named GLB clip in Preview (inverse, speed, optional start/end time; waits until the window finishes). The editor viewport transport can pose the same clips in Select/Add without running that graph. Wait pauses the chain for a duration (seconds) then continues; leave Preview or scene switch cancels in-flight waits. Open Modal only from a hotspot click. Animation is not on App Start. Post Message receive only on App/Scene Start. Subscribe polls only in Preview. The Legend trigger appears on Scene Actions while Enable legend is on (handles for All + each category) and runs that chain when the Preview legend drawer selects it.
- Post Message receive tester: opt-in **Test in Preview** on the node, then a HUD under the viewport info panel injects `{ event, data }` into live listeners and logs the send. Editor-session only; not authored on the graph.
- HTTP cache-reuse in Preview. Subscribe skip-unchanged. For Each + Switch + field interpolation.
- Spawn Hotspot from For Each items (xyz or lat/lon; lat/lon projects through geo reference on PlayCanvas). Replace-on-rerun. Template drawer + click-actions editor.
- Action fences (named colored frames, scene-scoped).
- Drag from a node handle onto empty canvas to add and connect a node.
- Custom menu buttons with optional toggle (two outgoing chains). Action button blocks are first-class canvas lanes (same node allow-list as menu buttons — no Open Modal).



### Preview chrome

- Project-wide General Settings: accent, inputs, borders, surface opacity/blur, legend / scene-explorer / hotspot-dialog surface colors, bottom-menu style, Scene Explorer enable.
- Legend drawer in Preview. Scene Explorer drawer in Preview (above the legend button) lists scenes with name, optional description, and thumbnail; click uses the Go To Scene transition. Logo overlay. Reset-view / home camera (orbit or geo viewport pose).
- Post Message receive test HUD (editor-only chip/panel, stacked under the viewport info HUD) when a receive node has Test in Preview on.



### Dev helpers

- `GET /http_request_node_test` — static Istanbul landmarks JSON.
- `GET /subscribe_node_test` — drifting landmarks + optional ferry (for Subscribe + Spawn).



## Partial

- **Editor save is manual.** No autosave, no version history (`project_versions` planned), no merge on conflict.
- **Hotspot JSON export** (`lib/editor/io/export-hotspots.ts`) exists but is not wired in the UI. It exports the current scene’s hotspots only, not the full project.
- **Home** `/` gates to auth or `/projects`. Product editor is `/projects/[id]/editor`.
- **App metadata / README** still say “Create Next App”.
- **Image overlay** `world` **pose** exists on the type; the layers UI and MapLibre path are geo-space. PlayCanvas world overlays are not a first-class editor flow.
- **Scene.layers comment** still says “image overlays now; more kinds later” even though shape overlays shipped.
- **Deprecated aliases** remain: `import-glb`, `scene-model-cache`, `importGlbFile`, `replaceFromFile` predecessors.
- `reference_editor_html/` is a legacy snapshot, not the running app.



## Planned / not built

These are implied by gaps or comments, not a committed roadmap.

- `project_versions` snapshots and autosave.
- Full project import / export file format.
- Additional overlay kinds beyond image + shape.
- Additional hotspot block types beyond heading / text / link / image / video.
- Wire or replace hotspot-only JSON export with a project-level format.
- Replace default Next.js metadata / README with product branding.
- Org admin (invites, roles UI), Cloudflare R2 (files, queues). Re-enable signup and email verification when that UI ships. Neon Function for complex server-side work.
- A viewer route that will be used on prod once a persistent memory (db backend) existed. It will be a lightweight version of editor's preview mode

