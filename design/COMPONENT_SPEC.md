# Implemented component contracts

All components use the same token/style layer. The following contracts describe this Golden Screen; they are not task cards for the deferred engineering phase.

| Component | Location | Contract |
| --- | --- | --- |
| App shell / navigation / header | `src/App.tsx` | owns replay and view state; compact/expanded/hidden nav; truthful phase notices |
| Button | `src/design/components.tsx` | native button props + `variant: quiet | primary | icon`; accessible names required on icon-only buttons |
| Status | same | `offline?: boolean`, children; semantic dot and label, no invented online accuracy |
| Metric | same | label, numeric/string value, note, optional direction and explanation callback; unavailable value is an em dash |
| Dialog / Drawer | same | title, eyebrow, children, onClose, optional drawer; native modal dialog; shared type/spacing/focus rules |
| CameraScene | `src/modules/vision/CameraScene.tsx` | `{ fixture, atMs, overlay, trajectories }`; no independent clock or random detection state |
| Event rail / list | `src/App.tsx` | receives the canonical snapshot; filters only presentation; timestamp/track/type are inspectable |
| ActivityChart | same | fixture + playhead; uses deduplicated snapshot events; 12 fixed 10-second bins |
| Camera cards | same | stable camera ID, selection and availability; selection resets the clock |

## Domain interfaces

`src/domain/replay.ts` exports Camera, Track, CameraEvent, Fixture, ScenarioId, Direction, EventType and the pure fixture/position/snapshot functions. The fixture is local, deterministic and camera scoped.

`CameraEvent`: id, cameraId, storeId, atMs, type, trackId, visitSessionId, confidence. Current supported types: track_started, line_crossed_entry, line_crossed_exit, duplicate_crossing_ignored, track_ended. Identity links and production device adapters are deliberately not fabricated for this screen.

`Track`: id, cameraId, start, crossing, end, x, direction, confidence, color, repeat. `positionAt` yields world x/z and normalized progress. `CameraScene` projects a person volume and footprint through the same Three.js camera used for rendering. Resize updates both camera projection and SVG viewBox.

`snapshotAt`: entries, exits, visits, deduped, distinctTracks, occupancy, activeTracks, events (newest first), atMs and available. Consumers must not independently increment totals or derive identities from track IDs.

## Reuse and extensions

Keep the snapshot contract independent of React and rendering. A later recorded-video adapter must supply timestamp-aligned track fixtures and disclose its source. A later real camera adapter must normalize events rather than bypass the canonical selector.

Maintain the measured distinction between active tracks and distinct observed tracks. Preserve per-camera namespaces. Do not sum two illustrative camera occupancies into a store total without a validated coverage/deduplication policy.

Charts must consume deduplicated snapshots. Unsupported future destinations must remain explicit previews until implemented and reviewed. All overlays remain visually subordinate to the scene. No production inference or authorization claims may be introduced through UI wording.
