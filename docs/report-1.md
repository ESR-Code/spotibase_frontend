# QA Report 1 — Editor pre-viewer audit

Scope: `/projects/[id]/editor` (state, persistence, action graphs/Preview runtime, viewport engines, UI workflows).
Method: static code audit by four parallel reviewers (persistence/state, action runtime, viewport engines, UI/workflows). Top findings were re-checked against the code; **nothing was reproduced in a running editor**. Small/cosmetic issues are deliberately skipped. The audit itself changed no code; fixes are tracked in the Status column and section below.

Severity: **Critical** = hangs or destroys work in a normal flow. **High** = data loss / wrong data / broken workflow with a plausible trigger. **Medium** = real bug, narrower trigger or recoverable.

## Status

Batch 9 fixed: **22-28** (all findings now closed). 27: subject limit is 150 MB for GLB; images stay at the 25 MB library limit plus an 8192 px side cap; the local-dev upload route now streams. 26: warns and asks instead of blocking. 23: guard is a hotspot chain, not a depth counter. 28: the three sub-items (leaked controllers, context loss, NaN bounds) are each handled. Not tested in a browser; scripted checks covered the georeference warnings, the hotspot-chain guard and (earlier) the scene-normalization round trip.

Batch 8 fixed: **16, 17, 18, 19, 21**. 21: receive nodes get an Allowed senders field; strict by default, including older saves (no viewer embeds exist yet). 17: impact-aware confirm, deterministic new primary, Undo toast; Go To Scene nodes are flagged, not rewritten. 18: Saved elsewhere menu (download / overwrite / reload); still no merge. 16: inactive scenes normalized at load (verified: a switch on an older-format project kept the fingerprint; before the fix it changed). 19: shared `setLegendCategories` also clears Spawn templates. Not tested in a browser.

Batch 7 fixed: **20** (`http-request.ts`: 15 s timeout, 5 MB cap, `credentials: "omit"`, same-origin GET/HEAD only and never `/gateway/`; in-flight requests abort when the run is cancelled). Behavior change: HTTP / Subscribe nodes no longer send cookies, and can no longer POST to this app's own origin. Checked with a throwaway script against a stubbed `fetch` (credentials, blocked routes, declared and streamed oversize, abort); the 15 s timeout path was not exercised. Not tested in the browser.

Batch 6 fixed: **13, 14** (`hydrateProject` resets the fences store; Publish uses `hasUnsavedChanges()` and says "Still saving" instead of silently doing nothing). Not yet tested in a browser.

Batch 5 fixed: **8, 9** (`ActionRunContext.runGeneration` + `itemScope`, `withItemScope`, `freshRunContext`; see `docs/decisions.md`). Behavior change: a scene switch now also stops the remainder of any chain that is still running (previously only the current Wait ended), e.g. an App Start chain that is mid-run. In-flight HTTP responses are ignored rather than aborted (aborting is #20). Checked with a throwaway script (cancel mid-chain stops later nodes; concurrent runs keep separate item scopes); not tested in the browser.

Batch 4 fixed: **10, 11** (`model-manager.ts` load sequence + stale discard, `use-playcanvas-editor.ts` newest-switch-wins, post-init scene reconcile, import bound to its scene; see `docs/decisions.md`). Behavior change: switching scenes (or starting a second import) while an import is still decoding cancels that import with a toast instead of applying it somewhere else. Not yet tested in a browser.

Batch 3 fixed: **12, 29** (`use-editor-keyboard.ts`: shortcuts yield to the Scenes / Assets / Publish / Actions dialogs, an open confirm dialog and an alignment session; Delete/Backspace also stays off while Scene or General settings drawers are open; Ctrl/Cmd/Alt combos, key repeat and IME composition are ignored). `P` with General settings open is still allowed on purpose (Preview keeps that drawer open). Not yet tested in a browser.

Batch 2 fixed: **5, 6, 15** (asset lifecycle: GC `keep` list + 15-minute grace for all new rows, delete checks the saved draft, store pruned after GC, undo history protects its assets). Residual: a manual library delete of an asset only referenced by undo history is still allowed, so a later Undo restores a missing-asset placeholder. Not yet tested in a browser.

Batch 1 fixed: **1, 2, 3, 4, 7** (see `docs/decisions.md`: acyclic graphs, Start-hop guard, leave guard, error boundary, reminted ids). Corrections found while fixing: in #7 the action graph was already deep-cloned (no shared arrays), only the node ids were shared. #3 does not cover programmatic `router.push` (for example account-menu sign-out). #2 does not cancel an in-flight transition when Preview exits (still #22). Not yet manually tested in a browser.

## Summary


| #   | Sev      | Status          | Area        | Title                                                                                                                      |
| --- | -------- | --------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1   | Critical | Fixed (batch 1) | Actions     | Action graph cycles loop forever (Switch, Subscribe)                                                                       |
| 2   | High     | Fixed (batch 1) | Actions     | Scene Start ↔ Go To Scene ping-pong with no exit                                                                           |
| 3   | High     | Fixed (batch 1) | Persistence | In-app navigation discards unsaved work silently                                                                           |
| 4   | High     | Fixed (batch 1) | UI          | No error boundary: any render error loses unsaved work                                                                     |
| 5   | High     | Fixed (batch 2) | Persistence | Asset GC after Save can delete an asset still in use                                                                       |
| 6   | High     | Fixed (batch 2) | UI          | Asset delete only checks live editor, not saved draft                                                                      |
| 7   | High     | Fixed (batch 1) | Actions     | Duplicated hotspot shares action graph (same node ids, same object)                                                        |
| 8   | High     | Fixed (batch 5) | Actions     | Cancelled/left Preview does not cancel running chains                                                                      |
| 9   | High     | Fixed (batch 5) | Actions     | For Each item scope is a global stack shared across async runs                                                             |
| 10  | High     | Fixed (batch 4) | Engine      | Async model load / import lands in the wrong scene                                                                         |
| 11  | High     | Fixed (batch 4) | Engine      | Scene switch during engine init is lost                                                                                    |
| 12  | High     | Fixed (batch 3) | UI          | Delete / P / V / A shortcuts fire behind open dialogs                                                                      |
| 13  | High     | Fixed (batch 6) | Persistence | Action fences leak across project reloads and re-save stale data                                                           |
| 14  | Medium   | Fixed (batch 6) | Persistence | Publish can skip the save (dirty flag is debounced 400 ms)                                                                 |
| 15  | Medium   | Fixed (batch 2) | Persistence | Asset store not refreshed after GC; undo restores deleted asset refs                                                       |
| 16  | Medium   | Fixed (batch 8) | Persistence | Legacy scenes load un-normalized, scene switch marks project dirty                                                         |
| 17  | Medium   | Fixed (batch 8) | UI          | Scene delete: generic confirm, dangling Go To Scene, arbitrary new primary                                                 |
| 18  | Medium   | Fixed (batch 8) | UI          | Save conflict is a dead end (only "Reload")                                                                                |
| 19  | Medium   | Fixed (batch 8) | UI          | Legend category delete in Spawn drawer leaves stale ids                                                                    |
| 20  | Medium   | Fixed (batch 7) | Actions     | HTTP/Subscribe: no timeout, size cap, abort; credentialed same-origin                                                      |
| 21  | Medium   | Fixed (batch 8) | Actions     | Post Message receive accepts any origin                                                                                    |
| 22  | Medium   | Fixed (batch 9) | Actions     | Go To Scene transition completes after leaving Preview                                                                     |
| 23  | Medium   | Fixed (batch 9) | Actions     | Open Modal onClose / Go To Hotspot self-loop traps user                                                                    |
| 24  | Medium   | Fixed (batch 9) | Engine      | Geo viewport stuck on loader if style/tiles fail                                                                           |
| 25  | Medium   | Fixed (batch 9) | Engine      | Overlay image failure aborts whole overlay sync                                                                            |
| 26  | Medium   | Fixed (batch 9) | Engine      | 3-point georeference applies garbage fit with no gate                                                                      |
| 27  | Medium   | Fixed (batch 9) | Engine      | Subject import: no size limit, allowed in Preview / during alignment                                                       |
| 28  | Medium   | Fixed (batch 9) | Engine      | Controller/listener leak when unmounting during first load; no WebGL context-loss handling; NaN bounds → continuous render |
| 29  | Medium   | Fixed (batch 3) | UI          | Modifier keys trigger shortcuts (Ctrl+A / Ctrl+V / Ctrl+P)                                                                 |


Recommended fix order before the viewer: ~~1, 2, 3, 4, 7, 5/6/15, 12, 29, 10/11, 8/9~~ (done), all items fixed.

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

---



## Manual click-through checklist

Everything below was verified by code reading, type checks and small scripts only, except where noted. Run it once in the browser (`npm run dev:local`; restart the Worker after pulling, batch 2 and 9 changed it). Use a project with at least two 3D scenes, one Geo scene, a few hotspots and some uploaded images. Tick as you go; anything that fails goes back into this report.

Already confirmed by hand: batch 1 to 3, the Allowed senders field (#21), and the later fixes you tested. Re-check them only as a regression pass.

### Batch 1: loops, leaving, crashes, copies (#1 #2 #3 #4 #7)

- [ ] Build Trigger → Switch → case → node X → back into the same Switch: the canvas refuses the last connection.
- [ ] Scene A Start → Go To Scene B and B Start → Go To Scene A, then Preview: it stops with a "loop stopped" toast, no endless fading.
- [ ] Edit a hotspot title, click the project name in the header: a "Leave without saving?" prompt appears. Stay, then press browser Back: prompt again. Save, then Back: leaves without a prompt.
- [ ] Duplicate a hotspot that has HTTP → For Each → Spawn: both copies run independently in Preview; editing one's nodes does not change the other.
- [ ] (Optional, needs a forced error) the "The editor hit an error" screen offers Save now / Download backup / Try again.



### Batch 2: assets (#5 #6 #15)

- [ ] Click Save, and while it runs upload an image and apply it to a hotspot: after saving the image still shows.
- [ ] Save a project using image X, remove X from the hotspot (do not save), try to delete X in Assets: refused with "Still used by the saved project". Save, then delete: works.
- [ ] Replace an image, Save: the old image disappears from the picker.
- [ ] Delete an action node that holds an image, Save, press Undo: the node returns with its image intact.
- [ ] Upload an image in Assets without using it, Save: it stays (15-minute grace).



### Batch 3: keyboard (#12 #29)

- [ ] Select a hotspot, open Assets (or Scenes, Publish, Actions), press Delete: nothing is deleted.
- [ ] With a confirm dialog open, press `P`: Preview does not toggle.
- [ ] Ctrl+A, Ctrl+V, Ctrl+P: the editor mode does not change and the browser handles them.
- [ ] Hold `P` or Delete: no repeating toggles or stacked confirms.
- [ ] Open Scene Settings, press Delete with a hotspot selected: nothing happens. With General Settings open, `P` still enters Preview and keeps the drawer.



### Batch 4: viewport races (#10 #11)

- [ ] Use a large GLB in scene B. Switch A → B → C before B finishes loading: C keeps its own model; returning to B loads B's.
- [ ] Switch A → B → A quickly: A is not empty.
- [ ] Start a big import, switch scene before it finishes: it cancels with a toast.
- [ ] Drop two files back to back: only the second applies.
- [ ] Open a project with a big GLB and click another scene while the loading overlay is up: the viewport ends on the second scene's model.



### Batch 5: runner (#8 #9)

- [ ] HTTP → For Each → Wait 1s → Spawn: click, leave Preview mid-loop, re-enter: nothing spawns from the old run.
- [ ] Click a hotspot whose graph has a Wait, then trigger Go To Scene: the rest of that chain does not run in the new scene.
- [ ] Run a For Each with a Wait and click another hotspot meanwhile: spawned `{{item}}` values stay correct.
- [ ] App Start Post Message receive, switch scenes, send the message: it still runs.



### Batch 6: fences and publish (#13 #14)

- [ ] Move a fence on the Actions canvas, leave without saving, reopen the project: the saved fences show, not the discarded ones.
- [ ] Edit something and click Publish within a second: the published version contains the edit.
- [ ] Click Publish while a save is running: "Still saving" instead of nothing.



### Batch 7: HTTP safety (#20)

- [x] An HTTP node pointed at `/http_request_node_test` and a Subscribe at `/subscribe_node_test` still return data.
- [ ] A node that POSTs to `/gateway/...` shows a validation error.
- [ ] A URL that never answers fails after about 15 seconds; Subscribe keeps polling afterwards.
- [ ] Start a slow request in Preview and leave Preview: no error toast afterwards.



### Batch 8: scenes, save, categories, senders (#16 #17 #18 #19 #21)

- [ ] Open an older project, switch scenes and back: the header still says Saved.
- [ ] Delete a scene: the confirm lists hotspots, new primary, Go To Scene targets, georeferences. Press Undo on the toast: the scene returns in place with its primary flag.
- [ ] Delete the primary scene: the first scene in the list becomes primary, not the open one.
- [ ] Save in two tabs: the second tab shows "Saved elsewhere" with a menu. Try Download my version, Keep mine (overwrite) and Reload latest.
- [ ] Delete a legend category from a Spawn Hotspot template: hotspots and templates drop the category.
- [ ] Post Message receive: type an Allowed senders value (it sticks). "Test in Preview" works with the field empty.



### Batch 9: transitions, map, georeference, import, engine (#22 to #28)

- [ ] Go To Scene, then press `P` during the fade: the splash disappears and the scene does not switch.
- [ ] Open Modal onClose → Go To Hotspot (self, run target actions): refused with a toast. A → B hand-off still works.
- [ ] Open a Geo scene offline: after the timeout "The map could not be loaded" with Try again; going back online and retrying works.
- [ ] A geo image overlay whose asset was deleted: one toast, the other layers still draw.
- [ ] Georeference with three points in a line (or a bad fit): the warning shows and Apply asks "Apply anyway".
- [ ] Import a GLB over 150 MB and an image over 8192 px: refused with a message. A GLB just under 150 MB uploads.
- [x] Try a subject import in Preview and during an alignment: refused.
- [ ] Replace the subject in a scene with an alignment: the georeference is marked invalid and a toast lists what to check.
- [ ] Open a project and navigate away immediately while the model loads: no console errors, no leftover toasts.



### Quick regression

- [ ] Create, edit, Save, reload: everything persists.
- [ ] Publish, Unpublish, republish an archived version.
- [ ] Undo / redo on the Actions canvas (Ctrl+Z, Ctrl+Shift+Z).
- [ ] Enter and leave Preview three times, then switch scenes in Preview: no stuck overlays or doubled hotspots.