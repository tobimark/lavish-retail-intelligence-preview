# LV05 UI polish — Sidebar scrollbar, Live Vision overlay, readability\n\n> **Note:** the homepage KPI changed after this UI pass (Service Coverage → Unique Customers). Current combined report: [`LV05_KPI_UC_AND_UI_REPORT.md`](LV05_KPI_UC_AND_UI_REPORT.md). This file remains the detailed sidebar/UI evidence for that pass.

- Status: **Implemented and verified in real Chromium at 1920×1080 / 1440×900 / 1366×768 / 1440×650.**
- Scope: **UI only.** No changes to conversion logic, replay/fixture data, face detection/tracking/dedup, model JSON, video assets, or simulated business values.
- Supersedes the UI snapshot in `LV05_LAVISH_OVERVIEW_REPORT.md` for this round.

---

## 1. Sidebar diagnosis and fix

### Actual DOM before the fix

```text
aside.sidebar                 sticky, height:100vh, flex column
├─ div.brand-area            height:94px
├─ div.sidebar-mid           flex:1; overflow-y:auto ← native scrollbar source
└─ div.sidebar-bottom        footer ~126px
```

The reference CSS had `.sidebar-mid { padding:30px 12px 16px; flex:1; overflow-y:auto }` with no scrollbar styling. At short viewports the menu content exceeded the flex remainder and Chromium painted its native scrollbar; at normal heights it could still reserve/paint a track when the menu just filled the area. That is the grey/white track with arrows the owner saw, not the main page scrollbar.

Measured before:

| Viewport | Sidebar mid client / scroll height | Result |
|---|---|---|
| 1920×1080 | 860 / 860 | content fits, but native `overflow-y:auto` still in place |
| 1440×900 | 680 / 680 | content fits |
| 1366×768 | 548 / 548 | content fits |
| 1440×650 | **430 / 537** | menu required native scrolling; visible browser track |

### Fix

- `.sidebar` now owns `overflow:hidden`.
- Explicit regions: `sidebar-header`, `sidebar-mid` (contains `<nav class="sidebar-nav">`), `sidebar-footer`; Header/Footer are `flex:0 0 auto`, Navigation is `flex:1 1 auto; min-height:0`.
- Navigation is the **only** sidebar scroll container; it uses hidden-scrollbar styling:
  - `scrollbar-width:none`
  - `-ms-overflow-style:none`
  - `::-webkit-scrollbar { width:0; height:0; display:none }`
  - `overscroll-behavior:contain`
- Wheel, trackpad and keyboard/tab scrolling still work when the menu genuinely overflows. Footer remains fixed and reachable.
- No font sizes were reduced; sidebar width, palette, selected state and Lavish styling are unchanged. Vertical padding was trimmed slightly (30→26 px) only to avoid unnecessary scrolling at normal heights.

### Verified

| Check | Result |
|---|---|
| 1920×1080 | no sidebar scroll; Header/Nav/Footer separated; no native track |
| 1440×900 | no sidebar scroll; no native track |
| 1366×768 | no sidebar scroll; no native track |
| 1440×650 | content 531 vs 430: wheel scrolls to bottom; footer stays at viewport bottom; keyboard focus reaches Settings |
| Collapse/expand | works at every tested size; nav + footer retained |
| Other pages | Visitor Analytics uses the same Sidebar behavior |
| Nested scroll | only `.sidebar-mid`; main page scroll untouched |

20/20 sidebar checks passed (`evidence/lv05-brand/sidebar-qa/sidebar-qa-results.json`).

### Before / after screenshots

| Viewport | Before | After |
|---|---|---|
| 1920×1080 | `sidebar-before-1920x1080.png` — `AC572E4D17B080D040940F526D3EF33C62A5192C2993335DF120D1FADB3802CA` | `sidebar-qa/sidebar-after-1920x1080.png` — `ED7A6D3696C07E8A410E1C8E64CCDEB9273D4B0CAAD1F8336FCEE416F1F17F98` |
| 1440×900 | `sidebar-before-1440x900.png` — `1EB552EE4727814F65EF4B66B660007C48F9E856F985166F53C215C29CDBD3AA` | `sidebar-qa/sidebar-after-1440x900.png` — `1A79871AD48B68B113BED168105CE9B794EB47B37FBB07B7F29B298799202B03` |
| 1366×768 | `sidebar-before-1366x768.png` — `02074205931BC53D41BD1A23580D9BDC7ECC8E0E14198465ADB32A2F7870DC87` | `sidebar-qa/sidebar-after-1366x768.png` — `5CBCB6FC90FC357D7BC2731143C730575A9BAE19E7014351BB7E6428D321F530` |
| 1440×650 | `sidebar-before-1440x650.png` — `9753F7B32A69B9BD0A83EF74EB72BA24E820DB33F5627D90917B98D9C69338A6` | `sidebar-qa/sidebar-after-1440x650.png` — `92FCCEDEFB79C747A8B05DD5A6E0DB6FF0B9BDF6E26FEBDE15550E2C472E0E79` |

Exact sidebar crops: `sidebar-crop-1920x1080.png` `11350C48…`, `sidebar-crop-1440x900.png` `BC692E5C…`, `sidebar-crop-1366x768.png` `BBA2A00C…`, `sidebar-crop-1440x650.png` `5C35B6CA…`. The 650 px scrolled state with footer still visible is `sidebar-qa/sidebar-650-scrolled.png` (`6CC6856C…`).

---

## 2. Live Vision compact overlay

- Compact card now shows only one HUD statistic (`FACE UV`) plus the time; `FACES NOW` moved to the expanded workbench.
- Removed the “No face detected in this frame” message from the compact card; it remains in expanded view when relevant.
- Foot line simplified to `00 Face UV · not store UV` + `View camera`; removed the extra source caption from the compact footer. The card header still distinguishes the clip.
- Compact labels stay hidden; detection boxes, real video, Face UV and current stats remain.
- Expanded keeps the full values: Face UV, Faces Now, clock, timeline ticks, Identity events, Detection/Trails, model note.

Clip labeling remains source-correct:

- Dataset A is a **real sample mall recording** → `Sample mall clip · real face-model replay` / `SAMPLE MALL FOOTAGE`.
- Dataset B is the supplied **AI-generated store clip** (visible 豆包 watermark) → `AI-generated store clip` / `AI-GENERATED STORE FOOTAGE`.

Compact capture: `evidence/lv05-brand/sidebar-qa/livevision-compact-card-1440x900.png` (`671889D9…`); expanded crop: `livevision-expanded-crop-1440x900.png` (`0996E589…`).

---

## 3. Auxiliary text and status-label cleanup

Contrast improved without changing the type scale:

| Element | Old | New |
|---|---|---|
| Subtitle | `#898780` | `#6F6B63` |
| Card subtext | `#99958D` | `#6F6B63` |
| Stat foot | `#928E85` | `#736F67` |
| Chart ticks / legend | `#A3A097` / `#89867E` | `#77736B` / `#6F6B63` |
| Insight body | `#908C83` | `#6F6B63` |
| Table header / note | `#9A958B` / `#A2A097` | `#77736B` / `#706C64` |
| Demo note | `#A3A097`, 10px | `#6F6B63`, 11px |

The simulated-data status under the page title is now a single compact badge row (`SIMULATED · DATASET A` + `Brand Concept`) with the full note in its title; the previous third explanatory sentence was removed from the hero area. No palette, type family, font size hierarchy or layout structure changed.

---

## 4. Verification

| Command | Exit | Result |
|---|---|---|
| `npm run build` | **0** | production build |
| `npm test` | **0** | Vitest **7/7** |
| `node evidence/lv05-brand/sidebar-qa.cjs` | **0** | **20/20 PASS** |
| `node evidence/lv05-brand/qa-home.cjs` | **0** | **30/30 PASS** |

Sidebar QA includes scrollbar computed style, layout width, Header/Nav/Footer separation, scroll at 650, wheel/keyboard, collapse/expand, other-page reuse and compact/expanded overlay comparison. No page/console/local-request errors.

Files changed in this round: `src/App.tsx`, `src/styles.css`, `src/modules/vision/LiveVisionModule.tsx`, `src/modules/vision/FaceOverlay.tsx`.
Unchanged: `src/data/overview.ts` (`F9D89071…`), `src/data/videos.ts` (`D60B3894…`), `src/modules/vision/videoAnalytics.ts` (`266DFAAA…`), model JSON/video, business data and algorithms.

Final build: `dist/assets/index-DZ7GkuAB.js` (`79593F53…`), `dist/assets/index-DFuL73QI.css` (`88E32EA4…`), `dist/index.html` (`C019866F…`).

## 5. Notes

- Page scrollbar on the right remains normal and is not removed.
- The remote App Store icon and its fallback are unchanged; reuse permission remains pending.
- This is a UI-only pass; visual approval remains with Astra/the visual owner.
