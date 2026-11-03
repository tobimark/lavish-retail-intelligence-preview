# V3.1 layout proposal · 2026-11-03

This proposal precedes implementation. User scope: readability and monitoring layout only; preserve replay.ts and CameraScene.tsx behavior and source. The broader V3 identity engine, 32-store data, multilingual interfaces and extra routes are not part of this change.

## Before → after at 1440×900 / 100%

| Element | Existing | Proposed |
|---|---|---|
| Camera | 957×460; dominates first view | approximately 700×394, 16:9 |
| Events | 319px; 10–11px text | approximately 570px; 14–15px text |
| KPI | beneath video | full-width overview before video |
| Controls | tiny single line | essential transport first; advanced overlay controls on a separate row |
| Devices | small text under video | full-width readable camera cards |
| Expanded view | icon-only Focus; no camera/event access | explicit Expand/Collapse, camera selector, event rail and state-preserving return |

```
Brand / store / demo status
Live Vision                         Help / Expand
Entries       Exits       Occupancy       Distinct tracks
Camera preview (~55%)    | Events (~45%)
16:9 source + Expand    | Filters / readable rows
Transport + tools       | Activity / measurement help
Camera network across the full workspace
```

Expanded: full-page analysis workspace, larger image with event rail, source selector, playback and overlay tools. Same mounted scene and parent replay state; no reset on mode changes. Explicit Collapse and Escape restore focus to the originating Expand control. This is a full-page workspace, not a modal, so natural page scrolling remains available.

Narrow screens: KPI two columns; preview then events; device cards stack. Natural vertical scrolling is preferred over smaller text. All existing drawers inherit the shared reading scale.

This document is the proposed structure; actual measurements and screenshots follow in READABILITY_ACCEPTANCE.md. No final design approval is inferred.
