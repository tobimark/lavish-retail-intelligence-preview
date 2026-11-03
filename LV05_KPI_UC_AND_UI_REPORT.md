# LV05 — UC KPI replacement + Sidebar/UI polish

> **Latest layout update:** the Store Overview hero/toolbar was compacted by ~31–33% after this report; see [`LV05_TOP_REGION_REPORT.md`](LV05_TOP_REGION_REPORT.md) for current geometry, screenshots and build hashes.

- Status: **Implemented and re-verified in real Chromium at 1920×1080 / 1440×900 / 1366×768 / 390×844** on the final tree (2026-11-03 22:32 local, after the hero/toolbar compaction). KPI order, UC independence, card geometry and Dataset A/B switching re-confirmed — see §5.
- Scope: homepage KPI replacement per request, Sidebar scrollbar/visual fix, Live Vision compact-overlay cleanup and auxiliary-text readability. No changes to face detection/tracking/dedup, model JSON, video assets or simulated business algorithms beyond the explicitly requested KPI field change.
- Full Service Coverage inventory: [`evidence/lv05-brand/SERVICE_COVERAGE_DIFF.md`](evidence/lv05-brand/SERVICE_COVERAGE_DIFF.md)

---

## 1. KPI change — Service Coverage → Unique Customers (UC)

Homepage KPI cards are now, left to right:

1. **Total Footfall**
2. **Unique Visitors · UV**
3. **Unique Customers · UC**
4. **Repeat Visitor Rate**

Layout, four-column grid, card size, palette, typography and interactions are unchanged. `Service Coverage` is no longer a homepage KPI.

### UC is a separate simulated field

`src/data/overview.ts` now carries a dedicated `uc` value and `delta.uc` per store/dataset, plus an independent `ucPeriodMultiplier` for week/month. It is **not** copied from UV and **not** produced by `uv * ratio` in code. The demo definition is *unique customers after staff/non-customer exclusion*; because the demo has no employee-identity or staff-recognition model, UC is explicitly simulated business data, not camera-derived. It is separate from the video’s `Recognizable Face UV`.

| Dataset | Store | Footfall | UV | **UC** | UC delta | Repeat |
|---|---|---:|---:|---:|---:|---:|
| A | Ajman · Mushairef | 1,842 | 1,506 | **1,329** | ↗ 11.6% | 18.2% |
| A | Dubai · Al Jaddaf | 1,565 | 1,275 | **1,108** | ↗ 7.9% | 16.4% |
| A | Al Ain · Al Yahar | 1,239 | 1,051 | **952** | ↘ 1.4% | 21.1% |
| B | Ajman · Mushairef | 2,164 | 1,712 | **1,498** | ↗ 6.2% | 21.6% |
| B | Dubai · Al Jaddaf | 1,798 | 1,402 | **1,226** | ↗ 4.4% | 19.4% |
| B | Al Ain · Al Yahar | 1,352 | 1,112 | **1,007** | ↗ 1.2% | 24.3% |

UC < UV in every row, and the UC/UV ratio is not a single fixed proportion (86.9%–90.6%; the same store differs A vs B). Week/month use an independent UC multiplier (A 6.4/27.5 vs 6.7/28.2; B 6.0/25.2 vs 6.2/25.9). Dataset A/B switching, store/date filters, chart tabs and export remain functional. CSV export now includes UC and retains Service Coverage with a “legacy metric pending confirmation” source note.

### Service Coverage difference list (not deleted)

Per the “do not delete unconfirmed modules” instruction, nothing was deleted or relabelled. Runtime surfaces retained:

| Location | Status |
|---|---|
| Homepage KPI card | Removed/replaced by UC — **approved in this task** |
| Network Snapshot `SERVICE COVERAGE` column | **Pending confirmation** — retained |
| Intelligence Highlights “Service coverage is improving… observed staff interaction” | **Pending confirmation** — retained |
| AI Insights placeholder “unattended visitors, and service opportunities” | **Pending confirmation** — retained |
| CSV Export `Service Coverage` row | **Pending confirmation** — retained |
| `service` / `delta.service` data fields | **Pending confirmation** — retained for Network/Insights/CSV |

No other implemented business page exists: Live Vision, Visitor Analytics, Store Network, Reports and Settings are concept placeholder cards, and the Store Network page does not render the Network Snapshot table. No **employee reception rate** metric exists anywhere in the shipped app.

Non-shipped reference/prototype artifacts that still show Service Coverage (excluded from deployment by `.vercelignore`, **not deleted**): `extended/LAVISH_LiveVision_RealVideo_Demo.html`, its byte-identical `extended/_poc/` duplicate, `extended/_design_pack/lavish_retail_demo/index.html`, and the `BRAND_HANDOFF.md` KPI spec. Full per-page and artifact inventory: [`SERVICE_COVERAGE_DIFF.md`](evidence/lv05-brand/SERVICE_COVERAGE_DIFF.md).

---

## 2. Sidebar scrollbar fix

### Root cause

`aside.sidebar` was a flex column with a `sidebar-mid { flex:1; overflow-y:auto }` navigation area and no scrollbar styling. At short viewport heights the menu exceeds the flex remainder; Chromium then paints its native grey/white scrollbar and arrows. The reference CSS also applied the native scrollbar track in normal-height cases. This was not the main page scrollbar.

Measured before: at 1440×650 the sidebar navigation was **430 px client / 537 px scroll**; at 1440×900 and 1366×768 content fit (680/680, 548/548) but the native overflow styling remained.

### Fix

- Explicit **Header / Navigation / Footer** flex regions:
  - `sidebar-header` (brand)
  - `sidebar-mid` → `<nav class="sidebar-nav">` (only scrollable region)
  - `sidebar-footer` (collapse + account)
- Header/Footer `flex:0 0 auto`; navigation `flex:1 1 auto; min-height:0`.
- `.sidebar { overflow:hidden }`.
- Native scrollbar fully hidden:
  - `scrollbar-width:none`
  - `-ms-overflow-style:none`
  - `::-webkit-scrollbar { width:0; height:0; display:none }`
- Wheel, trackpad and keyboard/Tab scrolling retained when genuinely needed; footer never clipped.
- No font-size reduction, no width/background/selected-state change. Only 4 px vertical padding trim (30→26) at normal heights.
- Only the sidebar navigation scrolls internally; main content page scroll is unchanged.

Verified: no sidebar scroll at 1920/1440/1366; at 1440×650 content 531/430, wheel scrollTop 101, footer visible, keyboard focus reaches Settings; collapse/expand works at all sizes; Visitor Analytics uses the same Sidebar. Sidebar QA **20/20 PASS**.

### Before / after screenshots

| Viewport | Before | After |
|---|---|---|
| 1920×1080 | `sidebar-before-1920x1080.png` — `AC572E4D…` | `sidebar-qa/sidebar-after-1920x1080.png` — `8A3B8CED9880928D0B9402F101D7F7214F5E7165C53EC357F7DE7C1391B0682C` |
| 1440×900 | `sidebar-before-1440x900.png` — `1EB552EE…` | `sidebar-qa/sidebar-after-1440x900.png` — `DF9547E150D1F2391D1DCC9B0DA41640D4B1D1EB67A8A72BDC51CE4ACF8F9A58` |
| 1366×768 | `sidebar-before-1366x768.png` — `02074205…` | `sidebar-qa/sidebar-after-1366x768.png` — `CB58652797E423DCFDEC3C954D51E50BF22CEB1364D622D0DE14252C80F18423` |
| 1440×650 | `sidebar-before-1440x650.png` — `9753F7B3…` | `sidebar-qa/sidebar-after-1440x650.png` — `AAB7A420E6F5885215B2D6E3517F5F3E249BCB0CEA178E9B90D507749B7B23E2` |

650 px scrolled with footer still visible: `sidebar-qa/sidebar-650-scrolled.png` (`6CC6856C…`). Exact crops: `sidebar-crop-1920x1080.png` (`11350C48…`), `sidebar-crop-1440x900.png` (`BC692E5C…`), `sidebar-crop-1366x768.png` (`BBA2A00C…`), `sidebar-crop-1440x650.png` (`5C35B6CA…`).

---

## 3. Live Vision compact overlay

- Compact card now shows only `FACE UV` + clock; `FACES NOW` is shown only in expanded view.
- Removed the “No face detected in this frame” text from the compact card; it remains in expanded view when relevant.
- Foot line simplified to `00 Face UV · not store UV` + `View camera`; extra source caption removed from the compact footer.
- Detection boxes, real video and current Face UV remain in the compact card.
- Expanded keeps full Face UV / Faces Now / timeline / Identity events / Detection / Trails.
- Real sample clip A is labelled `Sample mall clip` / `SAMPLE MALL FOOTAGE`; the AI-generated clip B is labelled `AI-generated store clip` / `AI-GENERATED STORE FOOTAGE`. A is not mislabelled as AI-generated.

Compact card: `sidebar-qa/livevision-compact-card-1440x900.png` (`36397FE788DFA9CCACD22E33FE8657BFA0BF17E59CC6664C516D2E443A403246`); expanded crop: `livevision-expanded-crop-1440x900.png` (`DAA591BA8275EA1AE9497CB9933CD15BFFB50D04DC9A7F46AFA163FFD774426B`).

---

## 4. Auxiliary text and status labels

Contrast-only improvements, no type-scale change:

| Element | New color |
|---|---|
| Subtitle / card subtext / insight body | `#6F6B63` |
| Stat foot | `#736F67` |
| Chart ticks | `#77736B` |
| Table header | `#77736B` |
| Demo note | `#6F6B63`, 11px |

The simulated-data status under the page title is now a single compact badge row: `SIMULATED · DATASET A` + `Brand Concept`; the old third explanatory sentence was moved into the title tooltip. Palette and layout are unchanged. (The badge row was later folded into the eyebrow line by the hero/toolbar compaction — see [`LV05_TOP_REGION_REPORT.md`](LV05_TOP_REGION_REPORT.md).)

---

## 5. Verification

Re-run on the final working tree after the concurrent hero/toolbar compaction (2026-11-03 22:32 local):

| Command | Exit | Result |
|---|---|---|
| `npm run build` | **0** | production build (`dist/assets/index-C6Ogat1d.js`, `index-ad02HyQG.css`) |
| `npm test` | **0** | Vitest **7/7** |
| `node evidence/lv05-brand/qa-home.cjs` | **0** | **32/32 PASS** on the final build |
| `node evidence/lv05-brand/sidebar-qa.cjs` | **0** | **20/20 PASS** |

Direct DOM measurements on the final build confirm the KPI strip itself was not altered by the compaction: four equal `.stat` columns at 1920/1440/1366 (**389 / 280.5 / 262 px** each), identical card CSS on all four (background `rgb(255,254,252)`, 12 px radius, same padding/shadow), labels `Total Footfall | Unique Visitors · UV | Unique Customers · UC | Repeat Visitor Rate`, no label wrap at desktop widths, no horizontal overflow at 390. Only the strip’s vertical position moved up (259.88 → 198.88 px at 1920), which is the separate hero-compaction task.

Home QA includes KPI order/values (`Footfall/UV/UC/Repeat`), UC ≠ UV, A/B dataset values, UC store/period updates, A/B video/model switch, seek/loop dedup, single-video expand, export, box projection, 1920/1440/1366/390 overflow, and zero page/console/local-request errors. Sidebar QA includes hidden scrollbar, region separation, 650 wheel/keyboard, collapse, and other-page reuse.

### After screenshots (final build)

`home-qa/overview-datasetA-1920x1080.png` — `EDC8A9C8FAB4BE23CE193ABC54209B1BEF4678A7D63080D0DE89E6547FB47C74`  
`home-qa/overview-datasetA-1440x900.png` — `17578FACC363B4C8B45D24262DF2C9433B51A57C01DB05702B05C00206E709EF`  
`home-qa/overview-datasetA-1366x768.png` — `3325AC10C4057BBCB70EDE21E8F2701F617B7748376CAEC8867B29868E18E05E`  
`home-qa/overview-datasetA-390x844.png` — `C5D128508E8B5CD290B68DCD6EAE055C82A659A889C7502CAFC2F59151785621`  
`home-qa/overview-datasetB-1440x900.png` — `EA2CD7780B590AC09DD3A00B257C65716171AABA9D92CF0585212E97086C491D`  
`home-qa/livevision-expanded-datasetB-1440x900.png` — `C4AA5472EEDBC627CF6C2F04BE9F1ACA7BFE215A072BE7946611F35D07C1C865`

---

## 6. Files / hashes

| File | SHA256 |
|---|---|
| `src/App.tsx` | `3F817511C14B44D86CFFD19D058CC89D365B57A01B9740B91D62B553A3A7F6D9` |
| `src/styles.css` | `16B0875865F05D9A4E9C80E5759943E097EAB8307C92EFA1A7297EC5FAFAF73F` |
| `src/data/overview.ts` | `9F4D9454549E924F14FF2700C2C17F361A6973CC4BFA2B03107395A7212B1B2C` |
| `src/data/videos.ts` | `D60B389498C73015DDE4E254D2EE0ACEF5F8EF8584CE052A38CD45DB673999C2` |
| `src/modules/vision/LiveVisionModule.tsx` | `BEA0AF5FAA1D7CE4C77B51486EFFAC87C3D7D4EEB0C6AFF38FBA481B980D7810` |
| `src/modules/vision/FaceOverlay.tsx` | `2B90BCF276FEE6F183DA168C8466182500FE883CDA9EF61A0DC5421B9A4F9A90` |
| `README.md` | `22531E7C31407A06B0A838CBBDEE2DED9D34F4BF2C1293A2C9359FFE420D1F45` |

Final build: `dist/assets/index-ad02HyQG.css` (`D4AA9DA0ECC4CCF457125A4D497D4207EC65887A645F87A1E7E6A401616D651B`), `dist/assets/index-C6Ogat1d.js` (`8A827E17DC95D21F3191D290FB22C54345DF589978055B489FE4CDAB059BA75A`), `dist/index.html` (`3C3B00C681B1D9CF88FB66A5DBC78AF3A8E5A900BA05CCC9030AC1B7A7C471BD`).

`App.tsx` / `styles.css` also include the later hero/toolbar compaction ([`LV05_TOP_REGION_REPORT.md`](LV05_TOP_REGION_REPORT.md)); the KPI markup and `.stats`/`.stat` styles are unaffected. `src/data/overview.ts` — the UC data contract — is unchanged since the KPI change. Unchanged by this task: face-model weights/timeline/metrics, `src/modules/vision/videoAnalytics.ts`, videos; the `service` data fields are retained for pending modules, not deleted.

## 7. Open item

Service Coverage remains in Network Snapshot, Intelligence Highlights, the AI Insights placeholder copy (“unattended visitors, and service opportunities”), CSV and the `service` data fields pending confirmation; the non-shipped prototype HTMLs and `BRAND_HANDOFF.md` also still describe it. UC is a separate simulated business field and not a camera-derived metric; no employee-recognition capability is claimed.
