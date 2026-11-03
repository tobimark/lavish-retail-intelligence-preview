# Screenshot review · Live Vision candidate 01

All screenshots are produced by Chromium from the running application. Reviewed through actual image inspection, not inferred from compilation. Final set is captured from the production build. Human visual acceptance is still pending.

## Actual findings and corrections

| Observation | Correction | Recheck evidence |
| --- | --- | --- |
| Initial camera aperture became narrower than its control bar when max-height constrained the aspect ratio, leaving a conspicuous ivory gap. | Set explicit full width; update Three camera aspect and SVG projection/viewBox together on resize. | All three layout JSON files confirm camera/toolbar widths match. Final three desktop captures have no gap. |
| Small event metadata and confidence labels weakened readability. | Increased metric labels to 12px, event title/meta to 11/10px, supporting prose to 11px; enlarged overlay labels. | Final 1440 and 1366 captures, plus measurement drawer. |
| Scene appeared too distant and model-like in the first composition. | Tightened the fixed camera zoom to 1.45 so the observed entrance and people occupy more of the aperture. The scene remains explicitly synthetic. | `iteration-01-1440x900.png` records an intermediate visual revision; final captures show the accepted-for-review framing. The original pre-fix image was inspected during the session but is not retained as a separate final artifact. |
| Wide screens allocated more than 80% of the workspace to the camera, making the interpretation rail too narrow. | Rebalanced to a 3:1 grid with minimum rail widths. | Final default camera share is 73.6–74.0% across target sizes. |
| Some straight walking paths could intersect the center consultation island. | Added deterministic aisle bends after the entrance, with model heading and history following the same path. | Domain collision-envelope test and final camera images. |
| Escape could fail to leave Focus Mode when a control retained focus. | Process Escape before ignoring keyboard input from controls. | Browser check explicitly covers Escape from a focused button. |
| Saving QA artifacts during development could trigger a reload and make comparison frames inconsistent. | Ignore screenshot output in the dev watcher; perform final QA on the production static server and assert the same 24-second snapshot at each size. | Final report verifies consistent 3 entries / 1 exit at all desktop sizes. |
| Camera selection scrolled the document down, causing an auxiliary screenshot to omit the top header. | Screenshot helper returns to document top before capture and clears non-modal focus decoration. | Final alternate-camera capture. |

## Final image index

| Image | Review purpose |
| --- | --- |
| [1920 × 1080](screenshots/live-1920x1080.png) / [full page](screenshots/live-1920x1080-full.png) | large-screen composition, main camera and event hierarchy |
| [1440 × 900](screenshots/live-1440x900.png) / [full page](screenshots/live-1440x900-full.png) | principal Golden Screen reference |
| [1366 × 768](screenshots/live-1366x768.png) / [full page](screenshots/live-1366x768-full.png) | short viewport, transport and metric visibility |
| [Focus](screenshots/focus-1440x900.png) | immersive dark camera workspace |
| [Expanded navigation](screenshots/navigation-expanded-1440x900.png) | nav labels, phase disclosure, narrower camera composition |
| [Overlay hidden](screenshots/overlay-hidden-1440x900.png) | unobstructed synthetic source and independent toggles |
| [Repeat entrance](screenshots/repeat-entrance-1440x900.png) | ignored crossing alongside the unchanged valid count |
| [Event inspection](screenshots/event-inspection-1440x900.png) | timestamp, provenance, count effect, shared drawer language |
| [Measurement notes](screenshots/measurement-notes-1440x900.png) | visit / track / identity definitions and readability |
| [Alternate camera](screenshots/east-camera-1440x900.png) | camera selection, independent baseline and alternate viewpoint |
| [Offline device](screenshots/offline-camera-1440x900.png) | unavailable source, em-dash counts, disabled transport |
| [Peak hour](screenshots/peak-hour-1440x900.png) | multiple tracks and denser event log |
| [390 × 844 mobile](screenshots/mobile-390x844.png) | stacked reading layout, no horizontal overflow |

## Review conclusion and limits

The camera is the largest continuous surface; the right rail remains secondary. The UI uses warm paper, charcoal, quiet serif headings and aligned sans-serif telemetry. Entry/exit semantics remain consistent across scene, event rail and activity chart. The corrected camera projection and overlay share a coordinate system. Default, expanded, focus, drawer, offline, repeat, peak and mobile states are captured.

Supporting technical microcopy remains deliberately small; review it at 100% on the actual presentation display. Short viewports scroll vertically for the camera list and supplemental content. Mobile detection labels are overview-level; detailed track inspection is a desktop task. The synthetic architectural scene is not photorealistic footage and makes no claim to be real video inference.

This is a reviewable design baseline candidate, not an automatic 90/100 verdict or a claim of client approval. No downstream task cards have been distributed.
