# Architecture

VectorForge is a Next.js App Router app. Almost all product code is the client-side editor at `/editor`. There is no database and no project persist layer; state lives in Zustand for the session.

## Layout

```
app/
  page.tsx                          # leftover create-next-app home (not the product)
  layout.tsx                        # root fonts / metadata
  editor/                           # VectorForge
    page.tsx → editor-page-client   # dynamic import, ssr: false
    layout.tsx                      # editor fonts + theme
    editor-theme.css
    _components/                    # editor UI (shell, viewport, drawers, actions)
  http_request_node_test/route.ts   # demo JSON for HTTP Request nodes
  subscribe_node_test/route.ts      # mutating JSON for Subscribe nodes
lib/editor/                         # domain: types, stores, engines, actions
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

## Runtime shape

```
EditorPageClient (ssr:false)
  EditorApp
    EditorShell
      ViewportFrame ── PlayCanvas (model/image) or MapLibre (geo)
      HotspotOutliner / Layers / Subject
      property + settings + legend drawers
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

On scene switch / add, `scenes-store` snapshots live stores into the outgoing `Scene` and hydrates the incoming one (`hotspots`, model, settings, environment, effects, geo, layers, `geoReference`). New per-scene fields must join that path.

**Preview overlays** (cleared when leaving Preview): `preview-appearance-store`, `preview-visibility-store`, `preview-spawned-hotspots-store`, `preview-mesh-highlight-store`, `preview-post-message-test-store`. Authored hotspots stay unchanged.

The Post Message receive tester HUD (`PostMessageReceiveTestSuite`) is editor chrome: opt-in keys live in the session store, not on the action node. It injects `{ event, data }` to the same window so live receive listeners run.

**Project-wide chrome:** `general-settings-store` (Preview style tokens). Not per-scene.

Hotspot vs layer selection is exclusive (`lib/editor/state/exclusive-selection.ts`).

## Action graphs

Graphs are `{ nodes, edges }` owned by:

| Owner | Id convention |
| --- | --- |
| Hotspot click | hotspot `id` (> 0) |
| App Start | `APP_START_OWNER_ID` (−1) |
| Scene Start | `SCENE_START_OWNER_ID` (−2) |
| Spawn click template (editor-only) | `SPAWN_CLICK_LANE_OWNER_ID` (−3), not persisted |
| Custom bottom-menu button | `ownerId ≤ MENU_BUTTON_OWNER_BASE` (−10000) |

Runtime metadata: `lib/editor/actions/registry.ts` (`validate` / `run`, optional `sceneTypes`). Canvas UI: `action-node-registry.tsx`. Allowed node types differ by owner (`action-owners.ts`). Runner: `run-action-graph.ts`.

XYFlow edits the graph; `flow-adapter.ts` maps domain nodes ↔ flow nodes. Named frames on the canvas are `ActionFence`s (scene-scoped).

`{{field}}` interpolation (`interpolate-fields.ts`) pulls from HTTP / Subscribe / Post Message / For Each item scope.

## Rendering

- **PlayCanvas:** `use-playcanvas-editor.ts` wires camera, picking, hotspots, model, effects, mesh highlight. Default box when no GLB is imported. Image scenes use the same engine with pan/zoom.
- **MapLibre:** `use-geo-map-editor.ts` + `geo/`. Markers, image/shape overlays, freehand draw, Nominatim search. Workers are copied to `public/` and served as JavaScript (`next.config.ts`).

## Geo alignment

Model scenes: 3-point. Image scenes: 2-point. Control points are the source of truth; `GeoReference.transform` is a derived local→ENU matrix (`coords/`). Used when spawning lat/lon hotspots onto an aligned PlayCanvas scene.

## Forms and UI

Settings drawers use react-hook-form + Zod (`lib/editor/forms/`). Editor chrome is custom (`editor-theme.css`, glass panels). `components/ui/` is shadcn (New York). Toasts: sonner.
