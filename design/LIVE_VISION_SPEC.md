# Live Vision · Golden Screen specification

## Scope and entry

`/` resolves to `/live`. This stage contains one completed business screen. The other six navigation entries are visibly labeled Next phase in expanded navigation and open a Concept Preview scope notice. They do not masquerade as implemented routes.

English interface, fixed synthetic date **31 October 2026, 14:00–14:02 Asia/Dubai (GST)**. This fixed demo date is distinct from the local development date. `DEMO REPLAY`, `Synthetic data`, and `SIMULATED CAMERA SCENE` explicitly disclose the source.

## Camera sources

| Camera | Store | Behavior |
| --- | --- | --- |
| CAM-DXB-01 | Dubai Mall | original synthetic entrance; opening occupancy 6 |
| CAM-DXB-02 | Dubai Mall | alternate synthetic camera/entrance illustration; opening occupancy 3 |
| CAM-MOE-01 | Mall of the Emirates | intentional offline state; no fabricated playback/events |

These are fictional operations, not live mall installations. Available cameras share the scene design with different camera angles and independent fixture namespaces. Counts are per-camera illustrations and must not be summed as a validated multi-camera occupancy system.

## Clock and canonical data

`createFixture(camera, scenario)` → `atMs` → `positionAt(track, atMs)` and `snapshotAt(fixture, atMs)`.

The replay uses one React-owned time position, advanced by `requestAnimationFrame` only while playing. Geometry, projected detections, trajectories, timestamps, event list, measurements and chart consume that position. No random runtime count generation or independent video loop exists.

Each scene lasts 120,000ms. Normal traffic contains 13 tracks; peak hour 26; repeat entrance 6. Track starts, crossings, endings, and repeated-crossing suppressions are predetermined. The physical counting line is at world z=2.4. People route around the consultation island. Anonymous IDs have no cross-camera identity meaning.

The snapshot is a pure derivation; it never accumulates a previous UI snapshot. Event IDs are idempotent. Repeated crossings in the same visit session/direction are suppressed within a 3,000ms cooldown. The Repeat entrance fixture explicitly logs its suppressed crossing.

## Measurements

- Entries: valid entrance crossings in the current clip to the playhead.
- Exits: valid exit crossings in the same window.
- Store visits: valid entries; short crossing jitter creates no new visit.
- In store, estimated: max(0, camera opening occupancy + entries − exits). Real deployments need complete entrance/exit coverage.
- Distinct tracks: distinct anonymous track IDs observed so far in this camera/clip. Not cross-day people or Known Unique Customers.
- Known unique customers: not connected and not inferred on this screen. The explanation drawer describes the separate consented identity requirement.

Example normal scene at 24,000ms: 3 entries, 1 exit, 8 estimated in-store, 5 distinct observed tracks, and 2 currently visible tracks. Different distinct/active track counts are intentional.

## Controls and state transitions

| Action | Result |
| --- | --- |
| Play / Pause, Space | advance/freeze the shared clock; completed replay starts again from zero |
| Speed | 0.5× / 1× / 2×, affects the single clock |
| Seek | pauses and recomputes every view at the selected timestamp |
| Step event | pauses at the next counting or suppression event |
| Reset demo | zero timestamp, paused, 1×, empty event log, opening occupancy, filter All; camera/scenario remain selected |
| Camera / store switch | chooses its fixture and resets replay; offline source shows unavailable state |
| Scenario switch | Normal / Peak / Repeat; resets the selected camera's replay |
| Detection | toggles boxes, IDs, confidence, arrows and counting line |
| Trails | independently toggles track history |
| Event panel / camera list | collapses the relevant surface without changing replay position |
| Navigation | compact, expanded, entirely hidden |
| Focus / F / Escape | removes surrounding shell and panels; retains scene, transport and metrics |
| Event filters | All / Entries / Exits, no change to totals |
| Event inspection | pauses, shows timestamp/provenance/count effect; View this crossing seeks precisely |
| How counting works | pauses and opens the measurement drawer |
| Guided demo | three-step explanation then starts the normal primary-camera replay |

## Failure and delivery behavior

No network is needed after dependencies are installed and a local static server is available. Runtime assets/fonts are bundled. A loaded browser session also continues to work after the browser network is disabled. Reloading from a completely offline HTTP server is not promised; there is no service worker.

WebGL failure produces an explicit fallback message rather than fake footage. Offline source gives no counts or events. Initial empty event state includes a direct Step action. Complete replay stops at 02:00. Native dialog handles focus containment and Escape. Mobile supports stacked reading, not a full monitoring console.

The project deliberately excludes the other business pages, 90-day multi-store datasets, live video inference, membership integration, backend services, and downstream task-card distribution in this stage.
