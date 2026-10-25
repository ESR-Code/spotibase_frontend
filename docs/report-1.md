# QA Report 1 — Editor pre-viewer audit

Scope: `/projects/[id]/editor` (state, persistence, action graphs/Preview runtime, viewport engines, UI workflows).
Method: static code audit by four parallel reviewers (persistence/state, action runtime, viewport engines, UI/workflows). Top findings were re-checked against the code; **nothing was reproduced in a running editor**. Small/cosmetic issues are deliberately skipped. No code was changed.

Severity: **Critical** = hangs or destroys work in a normal flow. **High** = data loss / wrong data / broken workflow with a plausible trigger. **Medium** = real bug, narrower trigger or recoverable.

## Status

Batch 1 fixed: **1, 2, 3, 4, 7** (see `docs/decisions.md`: acyclic graphs, Start-hop guard, leave guard, error boundary, reminted ids). Corrections found while fixing: in #7 the action graph was already deep-cloned (no shared arrays), only the node ids were shared. #3 does not cover programmatic `router.push` (for example account-menu sign-out). #2 does not cancel an in-flight transition when Preview exits (still #22). Not yet manually tested in a browser.

## Summary

| # | Sev | Area | Title |
| --- | --- | --- | --- |
| 1 | Critical | Actions | Action graph cycles loop forever (Switch, Subscribe) |
| 2 | High | Actions | Scene Start ↔ Go To Scene ping-pong with no exit |
| 3 | High | Persistence | In-app navigation discards unsaved work silently |
| 4 | High | UI | No error boundary: any render error loses unsaved work |
| 5 | High | Persistence | Asset GC after Save can delete an asset still in use |
| 6 | High | UI | Asset delete only checks live editor, not saved draft |
| 7 | High | Actions | Duplicated hotspot shares action graph (same node ids, same object) |
| 8 | High | Actions | Cancelled/left Preview does not cancel running chains |
| 9 | High | Actions | For Each item scope is a global stack shared across async runs |
| 10 | High | Engine | Async model load / import lands in the wrong scene |
| 11 | High | Engine | Scene switch during engine init is lost |
| 12 | High | UI | Delete / P / V / A shortcuts fire behind open dialogs |
| 13 | High | Persistence | Action fences leak across project reloads and re-save stale data |
| 14 | Medium | Persistence | Publish can skip the save (dirty flag is debounced 400 ms) |
| 15 | Medium | Persistence | Asset store not refreshed after GC; undo restores deleted asset refs |
| 16 | Medium | Persistence | Legacy scenes load un-normalized, scene switch marks project dirty |
| 17 | Medium | UI | Scene delete: generic confirm, dangling Go To Scene, arbitrary new primary |
| 18 | Medium | UI | Save conflict is a dead end (only "Reload") |
| 19 | Medium | UI | Legend category delete in Spawn drawer leaves stale ids |
| 20 | Medium | Actions | HTTP/Subscribe: no timeout, size cap, abort; credentialed same-origin |
| 21 | Medium | Actions | Post Message receive accepts any origin |
| 22 | Medium | Actions | Go To Scene transition completes after leaving Preview |
| 23 | Medium | Actions | Open Modal onClose / Go To Hotspot self-loop traps user |
| 24 | Medium | Engine | Geo viewport stuck on loader if style/tiles fail |
| 25 | Medium | Engine | Overlay image failure aborts whole overlay sync |
| 26 | Medium | Engine | 3-point georeference applies garbage fit with no gate |
| 27 | Medium | Engine | Subject import: no size limit, allowed in Preview / during alignment |
| 28 | Medium | Engine | Controller/listener leak when unmounting during first load; no WebGL context-loss handling; NaN bounds → continuous render |
| 29 | Medium | UI | Modifier keys trigger shortcuts (Ctrl+A / Ctrl+V / Ctrl+P) |

Recommended fix order before the viewer: **1, 2, 3, 4, 7, 5/6/15 (asset lifecycle together), 12, 10/11, 8/9**, then the rest.

---

## Critical

### 1. Action graph cycles loop forever
- **Where:** `lib/editor/actions/graph-ops.ts:113-133` (`chainFrom`) and `:199-216` (`connect`), `app/editor/_components/actions/actions-flow.tsx:1968` (`isValidConnection`), `lib/editor/actions/switch-case.ts:393-400`.
- **Repro:** Trigger → Switch; wire `Switch.case1` → node X; wire X → the same Switch. Enter Preview and click the hotspot.
- **Why:** `chainFrom` seeds `visited` empty, so the start node can reappear in its own chain (`[X, Switch]`). The Switch re-evaluates to the same case, forever; the promise chain grows unbounded. Subscribe has the same shape (tail contains Subscribe, which restarts its poll each payload). Connect/isValidConnection only reject self-edges (`source === target`). Verified in code.
- **Impact:** Preview tab hangs; unsaved work lost on forced reload.
- **Fix direction:** Reject cycle-creating edges at connect time, validate on load, and add a depth/run-token guard in the runner.

## High

### 2. Scene Start ↔ Go To Scene ping-pong
- **Where:** `lib/editor/actions/transition-to-scene.ts:253-295`, `lib/editor/state/scenes-store.ts:352-366`, `run-action-graph.ts:164-186`, `app/editor/editor-theme.css:4296-4303`.
- **Repro:** Scene A Start → Go To Scene B; Scene B Start → Go To Scene A. Enter Preview.
- **Why:** Every Preview `switchScene` runs the new scene's Start graph, which immediately transitions again. Validation passes (both scenes exist). The transition overlay is `pointer-events: all` and restarts before fade-out ends, so the user may be unable to click out.
- **Fix direction:** Visited-scene set / depth counter for Start-triggered transitions, plus a validation warning.

### 3. In-app navigation discards unsaved work silently
- **Where:** `lib/editor/hooks/use-project-save-shortcuts.ts:15-27`, `app/editor/_components/editor-header.tsx:43-49`, `editor-project-loader.tsx:50-57`.
- **Repro:** Edit a hotspot, click the back arrow/breadcrumb or browser Back.
- **Why:** The only guard is `beforeunload` (tab close/reload). Client-side route changes bypass it; loader cleanup calls `unbindPersistedProject()` without checking `dirty`.
- **Fix direction:** Leave-guard (save / discard / stay) on any in-app navigation while dirty or saving.

### 4. No error boundary around the editor
- **Where:** no `error.tsx`, `global-error.tsx` or boundary exists under `app/` (verified); editor mounted in `app/projects/[id]/editor/editor-page-client.tsx` and `editor-project-loader.tsx:96`.
- **Repro:** Any throw during render (e.g. hotspot with missing fields after a scene switch; hydrated data is cast, only id/position validated in `persist/schema.ts:56`).
- **Impact:** Tree unmounts, loader cleanup runs, in-memory project is gone.
- **Fix direction:** Boundary around `EditorApp` with "Try again / Save draft" (try a save of last serialized state).

### 5. Asset GC after Save can delete an asset in use
- **Where:** `lib/editor/persist/persist-store.ts:111-143`, `worker/src/assets.ts:339-415`.
- **Repro:** Click Save; while the RPC is in flight upload an image and apply it. When save returns, GC deletes the new `ready` asset (absent from the saved draft). Next save persists a dangling `asset:<id>`.
- **Fix direction:** Skip GC if uploads are pending or live state differs from the saved payload; or grace window for new ready assets.

### 6. Asset delete checks only the live editor
- **Where:** `app/editor/_components/assets/asset-library-dialog.tsx:61-69,150`; server only blocks for published versions (`worker/src/assets.ts:217`).
- **Repro:** Saved draft uses image X; remove it from the hotspot (unsaved); delete X in the library; reload/crash/conflict before saving → draft references a missing file.
- **Fix direction:** Server refuses deletion while the saved draft references it, or defer deletion to save+GC.

### 7. Duplicated hotspot shares its action graph
- **Where:** `lib/editor/state/editor-store.ts:253-276` (`duplicateHotspot`), `create-action-graph.ts:464-480`, `action-owners.ts:248-333`, `for-each.ts:238-256`, `http-request.ts:217-234`, `spawn-hotspots.ts:244`.
- **Why:** The copy keeps `{ ...source.actions }` (same `nodes`/`edges` arrays by reference, same node UUIDs; verified). Cross-graph lookups (`findActionNodeOwner`, `findHttpRequestNodeById`, HTTP cache fallback on `:${nodeId}`) resolve to the first owner. Result: the copy's For Each reads the original's graph, Spawn replace-passes never match, HTTP cache is shared. Spawned hotspots clone template graphs with the same ids. Editing nodes of one can mutate the other.
- **Fix direction:** Deep-clone and re-mint node/edge ids on duplicate and on spawn; resolve owner from `ctx.ownerId`.

### 8. Leaving Preview / switching scene doesn't cancel running chains
- **Where:** `run-action-graph.ts:48-117`, `for-each.ts:258-262`, `wait.ts:35-70`, `registry.ts:285-312`.
- **Repro:** For Each with Wait(1s) + Spawn; click, then Go To Scene or exit Preview; re-enter Preview.
- **Why:** `cancelPendingWaits` only resolves the current Wait as "stop"; the loop continues with later items under a new generation. No node-level run token; in-flight HTTP responses continue into later nodes.
- **Fix direction:** Per-run token checked between nodes and For Each items; abort fetches.

### 9. For Each item scope is a global stack
- **Where:** `lib/editor/actions/interpolate-fields.ts:48-66`, `for-each.ts:259`.
- **Why:** Module-level `itemScopeStack` is pushed/popped across `await`s. Concurrent runs (hotspot click, Subscribe poll, Post Message) interleave → wrong `{{item}}` values, wrong spawn `index`, wrong frame popped.
- **Fix direction:** Pass scope through `ActionRunContext`.

### 10. Stale model load / subject import lands in the wrong scene
- **Where:** `use-playcanvas-editor.ts:186-239, 574-587, 659-720`, `engine/model-manager.ts:313-489` (line 473 reads `activeSceneId` after the await), `io/import-subject.ts:53-66`.
- **Repro:** Switch A → B (slow GLB) → C before B finishes; or import a large GLB then switch scene; or drop two files in a row.
- **Why:** `instantiate*FromBuffer` has no cancellation; B mounts into C's viewport and the superseded `onSceneSwitched(B)` still hydrates B's model into live stores. Next switch snapshots that into C, overwriting C's data. Subject cache/asset link can end up under different scene ids. Imports aren't serialized.
- **Fix direction:** Token/AbortSignal into instantiate; capture `sceneId` before await; re-check after every await; queue imports.

### 11. Scene switch during engine init is lost
- **Where:** `use-playcanvas-editor.ts:255` vs listener registration at `:730`; event fired at `scenes-store.ts:349`.
- **Repro:** Open editor, click another scene while the first GLB downloads.
- **Impact:** Viewport shows the initial scene's subject while stores/outliner show the new one; save can snapshot the wrong state into the new scene.
- **Fix direction:** Register listener before first await, or reconcile with the active scene after init.

### 12. Shortcuts fire behind open dialogs
- **Where:** `lib/editor/hooks/use-editor-keyboard.ts:23-82` (verified).
- **Why:** Only `isPreview` and `actionsModal` are checked. Scenes, Assets, Publish, Georeference dialogs and settings drawers are not. `P` toggles Preview unconditionally.
- **Repro:** Select a hotspot, open Assets, press Delete (focus on a button) → delete-hotspot confirm appears over/behind. Press `P` with Publish open → Preview toggles underneath.
- **Fix direction:** One shared "any modal open" gate for all shortcuts.

### 13. Action fences leak across project reloads
- **Where:** `lib/editor/state/action-fences-store.ts` (module-level `byScope`), `persist/hydrate.ts` (never resets it; verified no reference in `lib/editor/persist`), `actions-flow.tsx:341-378`.
- **Repro:** Edit a fence (unsaved), leave, reopen the project (or reload after conflict). Canvas shows the stale store fences, and the next fence edit writes them into the scene, saving discarded edits.
- **Fix direction:** Reset the store in `hydrateProject` / loader cleanup.

## Medium

### 14. Publish may skip the save
`lib/editor/publish/publish-flow.ts:21-27`, `persist-store.ts:41-55`. Dirty is recomputed 400 ms after an edit; Publish within that window publishes the stale draft. Fix: recompute fingerprint at publish time.

### 15. Asset store stale after GC; undo restores deleted refs
`lib/editor/assets/api.ts:68-77` discards the GC result, so picker lists deleted assets (picking one saves a dangling ref). Undo of a deleted node (`actions-flow.tsx:774-790`) can restore an `asset:` ref GC already removed. Fix: refresh/prune the store after GC; clear history on successful save.

### 16. Legacy scenes load un-normalized
`persist/hydrate.ts:68-88` vs `scenes-store.ts` snapshot. Old saves (hotspots missing `enabled`/`shape`/`actions`/`customCamera`) load clean, then switching scene adds defaults and lights "unsaved", contradicting decisions.md. Fix: normalize in `sceneFromRow`.

### 17. Scene delete is blunt
`scenes-modal.tsx:508-518`, `scenes-store.ts:227-273`. Generic confirm (no hotspot count/primary/references), not undoable, other scenes' Go To Scene nodes (incl. App Start) dangle (runtime toast error), and deleting the primary makes the *currently active* scene primary arbitrarily.

### 18. Save conflict dead end
`toolbar/save-button.tsx:64-72`, `persist-store.ts:109-115`. Only "Reload to sync", which loses the local edits. Add overwrite / export-local-changes.

### 19. Legend category delete leaves stale ids (Spawn drawer)
`spawn-hotspot-general-tab.tsx:127-130` calls `setSettings` directly; the hotspot drawer (`hotspot-general-tab.tsx:57-77`) cleans references. Hotspots keep dead category ids and fall out of every filter. Fix: one shared delete-category function.

### 20. HTTP Request / Subscribe robustness and safety
`http-request.ts:159-181`, `subscribe.ts:310-320, 393-417`. No timeout/abort/size cap (hung Subscribe stalls silently, `inFlight` never resets). Same-origin requests send the session cookie, and non-GET methods can target `/gateway/...`, so a project authored by someone else could fire authenticated writes when a viewer clicks. Matters more once the viewer ships. Fix: AbortController + byte cap, `credentials: "omit"`, same-origin guard.

### 21. Post Message receive trusts any sender
`send-post-message.ts:83-103, 133-137`. No `origin`/`source` check; payload feeds `{{tokens}}` into HTTP/Spawn/Go To; rapid messages start overlapping runs. Add an allowed-origin field.

### 22. Go To Scene transition outlives Preview
`transition-to-scene.ts:269-293`. Exiting Preview within ~420 ms still runs `switchScene` in Select mode and leaves the overlay up. Bump `transitionToken` on Preview exit.

### 23. Modal/Go To Hotspot self-loop
`go-to-hotspot.ts:313, 446-466`, `open-modal-events.ts:48-101`. Open Modal onClose → Go To Hotspot (self, run target actions) re-opens the modal forever; guard doesn't include the click-run owner.

### 24. Geo viewport stuck on loader on style/tile failure
`components/ui/map.tsx:302-323, 406`, `use-geo-map-editor.ts:277-278`. No `error` handler or timeout: spinner forever, hotspots can't be added, thumbnail capture fails.

### 25. Overlay image failure aborts the whole sync
`geo-overlay-layers.tsx:148-296`, `layers/blend-overlay-image.ts:15`. `void sync()` with no try/catch; one 404 asset skips later layers and stack reorder; unhandled rejection.

### 26. 3-point georeference applies a bad fit
`coords/validate.ts:70-73`, `alignment-session-store.ts:290-311`. Near-collinear map points are accepted and Apply has no residual gate (a collinear ENU case returned `ok: true` with scale 0.75 vs true 2 and swapped axes). All spawn/lat-lon placement then wrong. Add RMS/collinearity gate with explicit confirm.

### 27. Subject import limits and context
`io/import-subject.ts:18-41`, `model-drop-overlay.tsx:41-46`, `model-manager.ts:458-466`. No byte/dimension cap (file held as buffer + blob + cache). Allowed during Preview and mid-alignment, leaving hotspots and georeference pointing at the old subject. Block in Preview/alignment; warn/revalidate georeference after replace.

### 28. Engine lifecycle gaps
- Unmount during first load leaks picking `window` listener, camera/picking canvas listeners, hotspot manager and global bindings (`use-playcanvas-editor.ts:130-159, 261-265`, `picking-controller.ts:480-483`).
- No WebGL `devicelost`/`devicerestored` handling anywhere in the engine; blank canvas until next invalidate.
- NaN/∞ GLB bounds produce a NaN camera (`camera-controller.ts:359-429`), so `cameraMoved` is true every frame (continuous render, Reset view can't recover).

### 29. Shortcuts ignore modifier keys
`use-editor-keyboard.ts:25-42`. Ctrl/Cmd+A enters Add mode, Ctrl/Cmd+V Select, Ctrl/Cmd+P toggles Preview (also hijacks browser print). Return early when ctrl/meta/alt is held.

---

## Checked and found fine
- Authored-field coverage in `serializeProject` / hydrate / scene snapshot, and `collectAssetRefs` (walks every `asset:` string; includes action graphs, blocks, layers, menu buttons, legend, general style). No gaps found.
- Dirty-tracking fingerprint: no save loop found.
- Action node types are consistent across runtime registry, UI registry and node component map (18 nodes).
- Dangling Go To Scene/Hotspot targets are caught by `validate` and toast at runtime (the problem is only that nothing cleans/flags them at delete time, see 17).
- Post Message listeners and Subscribe polls are cleared on Preview exit.
- Render-on-demand, viewport resize, viewport capture and geo store: no leak or render-loop issue found.
- Hotspot duplicate deep-clones blocks (the shared reference problem is the action graph only, see 7).

## Not covered / follow-ups
- `play-animation.ts`, legend and fence logic, and `lib/editor/history/` were not reviewed in depth by the action audit.
- Dropped as unsubstantiated: a save that commits server-side but times out client-side retrying into a self-inflicted conflict (plausible, not traced); `hotspot-image-field` stale-closure write after upload; hotspot form writing all fields back on any change (latent, no second live writer found).
- Dead code noted but not urgent: `lib/editor/io/export-hotspots.ts` has no callers (already listed as Partial in `features.md`).
- All findings need a manual repro pass before fixing, especially 2 (can the user escape via keyboard?), 10/11 (timing) and 5 (race window).
