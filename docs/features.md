# Features

Status as of the current codebase. “Partial” means code exists but the feature is incomplete, unwired, or session-only.

## Implemented

### Editor shell

- `/editor` client app: header, mode toolbar (select / add / preview), outliner, viewport HUD, drawers, dialogs.
- Keyboard: `V` select, `A` add, `P` preview, `Escape` / `Delete` for selection (ignored in text fields).
- Loading overlay, engine error banner, scene-transition splash.

### Scenes

- Multiple scenes; one primary. Types: **3D Model** (orbit + GLB), **2D Image** (pan/zoom + PNG/JPG/WebP), **Geo map** (MapLibre globe/flat).
- Type is fixed at creation. Settings sections and outliner tabs follow the scene-type registry.
- Subject import via file picker or drag-drop (`import-subject`). Scene subject cache when switching.
- Scene settings: camera limits, grid, logo, marker dialog presentation (modal / drawer / infobox, optional drawer inset), legend, custom Preview bottom-menu buttons.
- Environment + lighting (PlayCanvas). SSAO effects (model scenes).
- Geo start pin, zoom, map style, globe vs flat mercator. Nominatim place search.



### Hotspots

- Place, select, drag, duplicate, delete. Types, colors, styles (dot / number / icon / image / hidden), shapes (circle / square / rounded / diamond / pin), pulse, wick, enable flag.
- 2D/3D: click a marker to open the Hotspot Editor; drag repositions without opening it.
- Per-hotspot custom camera pose. Category + legend name.
- Content blocks: heading, text, link, image (optional per-slide caption; 2+ images become a Preview carousel), video (YouTube / Vimeo embed). Token fields can insert HTTP / Post Message / For Each paths.
- Preview: hover tooltip, select label, open presentation, legend filter.



### Layers (geo)

- Image overlays (opacity, edge blend, geo pose).
- Shape overlays: square, triangle, circle, freehand ring. Draw mode on the map.
- Outliner layers tab: visibility, lock, reorder, exclusive selection vs hotspots.



### Georeference

- Align a model (3-point) or image (2-point) scene to a Geo Map scene. Viewport pick banners/markers, residual validation, stored `GeoReference`.



### Action graphs

- Canvases: hotspot click, App Start, Scene Start, Legend (when enabled), custom menu buttons, Spawn template + nested click graph.
- Nodes: Open Modal, Go To Scene, Go To Hotspot, Open URL, Post Message (send/receive), HTTP Request, Subscribe, Enable/Disable, Enable/Disable Mesh, Highlight Mesh, Animation, Change Color / Icon / Number & Title, For Each, Spawn Hotspot, Switch, Wait.
- Mesh nodes and Animation only on `model` scenes. Animation plays a named GLB clip in Preview (inverse, speed, optional start/end time; waits until the window finishes). Wait pauses the chain for a duration (seconds) then continues; leave Preview or scene switch cancels in-flight waits. Open Modal only from a hotspot click. Animation is not on App Start. Post Message receive only on App/Scene Start. Subscribe polls only in Preview. The Legend trigger appears on Scene Actions while Enable legend is on (handles for All + each category) and runs that chain when the Preview legend drawer selects it.
- Post Message receive tester: opt-in **Test in Preview** on the node, then a bottom-right HUD injects `{ event, data }` into live listeners and logs the send. Editor-session only; not authored on the graph.
- HTTP cache-reuse in Preview. Subscribe skip-unchanged. For Each + Switch + field interpolation.
- Spawn Hotspot from For Each items (xyz or lat/lon; lat/lon projects through geo reference on PlayCanvas). Replace-on-rerun. Template drawer + click-actions editor.
- Action fences (named colored frames, scene-scoped).
- Drag from a node handle onto empty canvas to add and connect a node.
- Custom menu buttons with optional toggle (two outgoing chains).



### Preview chrome

- Project-wide General Settings: accent, inputs, borders, surface opacity/blur, legend + hotspot-dialog surface colors, bottom-menu style.
- Legend drawer in Preview. Logo overlay. Reset-view / home camera (orbit or geo viewport pose).
- Post Message receive test HUD (editor-only chip/panel, bottom-right) when a receive node has Test in Preview on.



### Dev helpers

- `GET /http_request_node_test` — static Istanbul landmarks JSON.
- `GET /subscribe_node_test` — drifting landmarks + optional ferry (for Subscribe + Spawn).



## Partial

- **No project persistence.** Scenes, graphs, and settings are in-memory. Refresh loses work.
- **Hotspot JSON export** (`lib/editor/io/export-hotspots.ts`) exists but is not wired in the UI. It exports the current scene’s hotspots only, not the full project.
- **Home** `/` is still the create-next-app starter. Product entry is `/editor`.
- **App metadata / README** still say “Create Next App”.
- **Image overlay** `world` **pose** exists on the type; the layers UI and MapLibre path are geo-space. PlayCanvas world overlays are not a first-class editor flow.
- **Scene.layers comment** still says “image overlays now; more kinds later” even though shape overlays shipped.
- **Deprecated aliases** remain: `import-glb`, `scene-model-cache`, `importGlbFile`, `replaceFromFile` predecessors.
- `reference_editor_html/` is a legacy snapshot, not the running app.



## Planned / not built

These are implied by gaps or comments, not a committed roadmap.

- Save / load (or full project import-export) covering scenes, graphs, subjects, layers, and geo references.
- Additional overlay kinds beyond image + shape.
- Additional hotspot block types beyond heading / text / link / image / video.
- Wire or replace hotspot-only JSON export with a project-level format.
- Replace the `/` starter page and default Next.js metadata with a product entry.
- Backend, auth, or multi-user hosting (none present).
- A viewer route that will be used on prod once a persistent memory (db backend) existed. It will be a lightweight version of editor's preview mode

