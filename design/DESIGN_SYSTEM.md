# SILLAGE · Design system 01

Status: implemented baseline candidate, pending human approval. Scope: Live Vision.

## Composition

An ivory editorial frame wraps a charcoal camera instrument. Cormorant Garamond introduces the product and the interpretation layer; DM Sans handles operational information. No gradients are used as decorative surfaces. A functional slider progress fill is the only CSS gradient.

The default desktop work surface is a 3:1 camera/event grid with a 20–24px gutter. The camera and its controls occupy approximately 74% of the work surface. The camera aperture starts at 16:9 and adapts to available vertical space; the 3D perspective and SVG overlay recalculate together. The image is never stretched. The camera list and supplemental explanations may continue below the first viewport so the central camera and controls remain legible.

Navigation: compact 76px, expanded 224px, or completely hidden. Focus mode removes navigation, the global header, event rail, and camera list while retaining playback and the four measurements. It is an in-app focus workspace, not a request for browser fullscreen permission.

## Typography

| Role | Typeface / size | Treatment |
| --- | --- | --- |
| Wordmark | Cormorant Garamond / 25px | 4px tracking |
| Page heading | Cormorant Garamond / 45px | regular; 41px on short desktop |
| Rail heading | Cormorant Garamond / 28px | regular |
| Drawer heading | Cormorant Garamond / 35px | regular |
| Measurement | DM Sans / 30px | tabular figures; no animated fake counts |
| Main controls | DM Sans / 12px | regular or medium |
| Metric label | DM Sans / 12px | quiet but readable |
| Event title / meta | DM Sans / 11px / 10px | event type and timestamp grouped |
| Technical microcopy | DM Sans / 8–10px | supporting information only |

Fonts are bundled through Fontsource. SIL Open Font License copies are in `public/licenses/`. No font CDN is required at runtime.

## Surfaces and semantics

- Canvas / warm ivory: app frame and measurement strip.
- Obsidian: navigation, camera header, playback instrument, focus mode.
- Paper: event log, modal, drawer.
- Sage: entry, availability, active selection. Clay: exit and unavailable-device accent. Brass: counting threshold and playhead, used sparingly.
- Line separators define relationships, not independent boxed dashboard cards.
- Drawers share heading, close control, content rhythm, and focus handling with dialogs.

## Data visualization

The activity chart is a compact paired bar chart, one bin per 10 elapsed seconds. Entry and exit colors match the event list. Future intervals remain empty; the playhead is a fine brass dashed line. Both bars and measurements derive from `snapshotAt`, which removes duplicate IDs and suppresses repeated crossings. No smoothed curves imply measurements that do not exist.

## Interaction and accessibility

Native buttons, selects, range input and modal `dialog` keep keyboard semantics. Toggle controls use `aria-pressed`; navigation has `aria-current`; the camera list has `aria-expanded`. Controls have visible focus outlines. The replay log deliberately does not announce updates every frame.

Space toggles playback when not editing or activating another control. F enters/exits focus; Escape exits focus or closes a dialog. Native modal focus containment and restoration are retained. Opening an inspection or explanation pauses the replay.

Reduced-motion users receive no decorative transitions. Scene motion is opt-in via Play. Mobile reflows to a reading layout with camera, metrics, camera list, then event log. It does not attempt a tiny replica of the desktop workstation.

## Boundaries

The synthetic scene needs WebGL. If WebGL is unavailable or lost, a clear message replaces the camera; event replay remains inspectable. An offline camera generates no events, disables transport, and displays em dashes for measurements. No authentication, production camera, CRM, cloud API, or external AI model is connected.

Further business screens must inherit these primitives after human acceptance. This file does not authorize their implementation or declare the design frozen.
