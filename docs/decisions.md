# Decisions

Only decisions that constrain how new work should be done.

## Stack

- **Next.js 16 App Router + React 19 + TypeScript.** Editor route is `"use client"` and loaded with `dynamic(..., { ssr: false })` so PlayCanvas, MapLibre, and Zustand never run on the server.
- **Zustand** for editor state, not React Context and not a single mega-store. Live stores are the active scene; `useScenesStore` is the project record.
- **react-hook-form + Zod** for settings/hotspot forms. Store writes stay in the form hooks.
- **@xyflow/react** for action graphs. Domain graph stays `{ nodes, edges }`; `flow-adapter.ts` is the only UI mapping.
- **PlayCanvas** for model/image scenes; **MapLibre** for geo. Scene type picks the engine — do not render both as the interactive viewport.
- **Tailwind 4 + custom editor tokens** (`editor-theme.css`). shadcn (`components/ui`) for primitives; editor chrome in `app/editor/_components/ui`.
- **Editor toasts** are custom (`lib/editor/toast.ts` + `EditorToaster`), not sonner. Mount the toaster inside `.editor-root` so glass tokens apply; keep them bottom-right so they don’t cover the center viewport menu.
- **Devcontainer / WSL:** `WATCHPACK_POLLING` and webpack `watchOptions.poll` so file watching works. Keep that if changing `dev` or `next.config.ts`.

## Scene model

- **`Scene.type` is immutable** after create. Camera mode, subject loader, settings sections, and outliner tabs come from `scene-types/registry.ts`, not ad-hoc checks.
- **Snapshot on switch.** Outgoing live stores are written back onto the `Scene`; incoming scene hydrates the live stores. New per-scene data must be cloned in `snapshotCurrentIntoScene` and restored in `switchScene`.
- **New scenes** copy the primary scene’s settings/environment but start with empty `resetPosition` and `customMenuButtons`.
- **At least one scene** is required. Deleting a geo scene referenced by a `geoReference` marks that reference `invalid`.
- **Scene Explorer enable is project-wide** (`general-settings-store.sceneExplorerEnabled`), unlike per-scene `legendEnabled`. Description and thumbnail live on `Scene`, not `EditorSettings`.

## Actions

- **Registry-driven nodes.** Add a type to `hotspot-action.ts`, defaults in `create-action-graph.ts`, `validate`/`run` in `actions/registry.ts`, and a canvas component in `action-node-registry.tsx`. Gate with `sceneTypes` when the node is engine-specific.
- **Owner allow-lists** (`action-owners.ts`) decide which nodes appear on hotspot vs start vs menu / Action button graphs. Start graphs cannot use Open Modal; menu and Action button graphs cannot either. Animation is on hotspot, Scene Start, Legend, menu, and Action button graphs — not App Start.
- **Synthetic owner ids** (`−1`, `−2`, `−4`, Action buttons `−5000…−9999`, `≤ −10000`) must never collide with hotspot ids, spawn-click (`−3`), or spawned ids (`SPAWNED_HOTSPOT_ID_BASE = 1_000_000`).
- **Preview overlays, not authored edits**, for Enable/Disable, appearance changes, mesh highlight, spawned pins, and GLB animation playback. Leaving Preview resets them (including bind pose) and stops Subscribe polls / Post Message listeners / HTTP cache.
- **Editor pose preview** is session chrome (`editor-anim-preview-store`), not snapshotted onto the Scene. The viewport transport plays/scrubs named GLB clips in Select/Add so authors can place hotspots against a posed mesh. It does not run the action graph. Graph Animation stays Preview-only. Enter/leave Preview, scene switch, and subject replace restore bind pose and idle the slider.
- **Post Message receive tester** is editor-session state (`preview-post-message-test-store`), not `node.data`. It injects `{ event, data }` to the same window; do not rewrite send targets or fall back to `self` for outgoing sends. Do not show this HUD in a future viewer.
- **`run` returning `"stop"`** ends the primary walk (Open Modal branches, Subscribe poll, receive-mode Post Message, Switch/For Each tails, cancelled Animation playback).
- **Legend trigger** is first-class like Scene Start: a scene-scoped graph (`legendActions`) whose canvas lane appears only while Enable legend is on. One source handle per category (plus All). `selectLegendFilterCategory` walks the matching handle; leaving Preview must not fire it. Keep the graph when legend is turned off so re-enabling restores wiring.
- **Action fences are scene-wide** so hotspot and scene canvases share the same frames.
- **Animation clips by name.** The Animation node plays named glTF clips from the loaded GLB, not Blender frame ranges. Optional start/end seconds trim that clip (defaults to the clip’s own range). `run` waits until the window completes, then holds that pose; interrupt / leave Preview / subject replace cancels the wait (`"stop"`). Editor Select/Add can scrub the same clips via the viewport transport without waiting or continuing the graph.
- **Wait** pauses the primary walk for `durationSeconds` (0–300, default 1) then continues. Available on every owner including App Start. Leave Preview or scene switch cancels in-flight waits (`"stop"`).

## Geo and coordinates

- **Canonical local frame is ENU:** +X east, +Y north, +Z up (meters). Control points are source of truth; the 4×4 is derived.
- **3-point alignment for models, 2-point for images.** Geo scenes are not alignment targets.
- **Spawn lat/lon on PlayCanvas** goes through `geoToScene` only when `geoReference.status === "aligned"`.

## Rendering details

- PlayCanvas uses `FILLMODE_NONE` + manual resize (`viewport-resize.ts`) so CSS owns canvas size.
- Backbuffer pixel ratio is capped at 1.5 (`MAX_PIXEL_RATIO` in `viewport-resize.ts`).
- Viewport thumbnails call `app.render()` then `toDataURL` in the same turn; do not leave `preserveDrawingBuffer` on.
- MapLibre workers are copied into `public/` on `postinstall` and served with a JavaScript `Content-Type` (module workers).
- On geo scenes the PlayCanvas layer stays mounted but hidden, and `autoRender` is turned off so the 3D loop does not keep drawing.
- Model-scene key-light shadows are 2048² with one cascade. If the loaded GLB has animation clips, `SHADOWUPDATE_REALTIME`; otherwise `SHADOWUPDATE_THISFRAME` (frozen map). Recapture after light or model-transform changes. Do not refit `shadowDistance` while frozen so orbiting stays cheap.
- 3D hotspot drag moves the live entity only; the authored position is committed on pointerup.

## Hotspot content blocks

- **Registry-driven blocks.** Add a type to `hotspot-block.ts`, defaults in `create-block.ts`, non-UI meta in `blocks/registry.ts`, and Editor / Preview / `collapsedPreview` in `block-registry.tsx`. Do not add one-off `if (type === …)` checks in the blocks tab.
- **Image blocks** store slides in `items[]` (uploaded data URL or a URL / `{{token}}`) with an optional per-slide caption. Caption and URL fields persist tokens immediately (same insert control as other blocks). Preview and Spawn interpolate both `src` and `caption`. One slide is a still; two or more render a Preview carousel (buttons only — do not bind ArrowLeft/Right, those switch hotspots in the marker dialog).
- **Video blocks** accept YouTube or Vimeo URLs only. Parse to a privacy-aware embed (`youtube-nocookie` / `player.vimeo.com`). No file upload or direct `.mp4`. Token URLs are interpolated, then checked as YouTube/Vimeo (editor hint + Preview iframe).
- **Action button blocks** store icon, label, optional italic description, a synthetic graph owner (`−5000…−9999`), and an action graph. Preview interpolates label and description. They appear as first-class canvas lanes after hotspot click lanes (so fence Y for hotspots does not shift). Same allow-list as custom menu buttons (no Open Modal). Remint `ownerId` when duplicating a hotspot or spawning from a template; keep it on scene load.

## Persistence and IO

- **Session-only.** No localStorage/IndexedDB project save. Do not assume refresh keeps work.
- Subject files stay in memory (`scene-subject-cache`). Import is a window event (`editor:import-subject`), not a direct engine call from the file picker.
- Existing `exportHotspots()` is a hotspot-list dump, not a project format. Do not treat it as the save system.

## Documentation

- Agent docs live in `AGENTS.md` and `docs/`. Update them when architecture, features, or decisions change; not for trivial edits.
