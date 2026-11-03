# LAVISH Retail Intelligence — LV05 brand + real-video / real-model implementation report

> **SUPERSEDED (2026-11-03, later same day):** the visual owner requested that the standalone reference HTML be used as the homepage. The current implementation and evidence are in [`LV05_LAVISH_OVERVIEW_REPORT.md`](LV05_LAVISH_OVERVIEW_REPORT.md). This file is retained as history for the first attempt only.

- Status: **Implemented and verified locally; ready for Astra / visual-owner review.** Not an approval and not a Design Baseline update.
- Date: 2026-11-03 (Asia/Shanghai)
- Workspace: `D:\workspace\SILLAGE`
- Scope of this pass: Lavish brand system, recorded-video Live Vision, real YuNet + SFace inference, anonymous Face UV replay, responsive QA and regression. No next phase was started.

---

## 1. Executive summary

| Goal | Result |
|---|---|
| Lavish brand system | Light canvas + paper surfaces, neutral black sidebar/header, warm gold accents, semantic green/red kept separate. Brand tokens replace the old palette; all visible surfaces share the tokens. |
| Header / sidebar / logo | Lavish wordmark, gold monogram, brand navigation labels, demo state `RECORDED DEMO / ANALYSIS REPLAY`. Official logo assets were not supplied; the UI carries **Temporary wordmark · official logo pending**. |
| Real video | The existing Live Vision camera area now renders `4750061…mp4` (sample mall footage) as one persistent `<video>` element. Small workspace and expanded workbench share that exact element; playback/seek state is not remounted. |
| Real models | **YuNet 2023mar + SFace 2021dec actually ran** on the supplied clip: 257 model samples at 10 fps, 165 detections, 8 candidate anonymous identities, **6 confirmed Recognizable Face UV**, 2 low-support tracklets excluded. |
| Sync / dedup | All visible analytics derive from `video.currentTime` plus the model timeline. Confirmations are anchored to `confirmed_at_ms`; the cumulative set is rebuilt on seek/loop, never incremented. Direct 20 s and 5 s→20 s seek both produce Face UV 6. |
| Video overlay | SVG boxes use the source `1280×720` viewBox with `preserveAspectRatio="xMidYMid meet"`; it shares the video rectangle exactly. Box projection error at 12 s is < 1 px at 1440. Labels are collision-resolved and have leader lines. |
| Business data | Existing synthetic LV05 camera KPIs (Entries 03 / Exits 01 / In store 08 / Distinct tracks 05 at the fixed 00:24 fixture snapshot) are preserved and clearly marked synthetic; video playback and Face UV never mutate them. The store selector still changes those fixtures. |
| QA | Build **0**, unit tests **7/7**, browser QA **21/21 PASS**, zero page/console/request errors, overflow checks at 1920/1440/1366/390. |
| Metric honesty | UI and report explicitly say the footage is not a Lavish store and Face UV is not store UV, UC, footfall or staff identity. No real identity lookup, cross-store re-ID or employee recognition is claimed. |

---

## 2. Code inventory and change list

No git repository exists in this workspace, so a commit hash cannot be produced. Baseline identification uses the LV05 source hashes that were recorded before this pass; current files are listed with SHA256. The pre-change screenshots in `evidence/lv05-brand/before/` are the visual baseline.

### 2.1 Changed / new files

| File | Baseline hash (before this pass) | Current SHA256 | Change |
|---|---|---|---|
| `src/App.tsx` | `F7AC953C13987761DFD4ED1F529D7D5FAE3E513D0C5B019560073A5159652CC4` | `FA18E9AE6750315E88332D60657505E4F50F5CFFFDA8ED0F47FACBEF9C0AD81C` | Branded shell, single-video state/controls, Face UV/identity rail, provenance and boundary copy, dialogs, mobile header, business fixture isolation |
| `src/styles.css` | `3162361E75D31FB64E2CBC9B36EA2F729D44C0FDC8139378C8705D006038DD67` | `0D4C60C320697B807106C783BE66BD8DFF2B375AD983A9BC0C70B610779E44C2` | Brand layer, video/overlay/controls/identity rail/source cards/chart styles, mobile fixes |
| `src/design/tokens.css` | `1391F327A90525B7A538972A6C56C6342FB3BE6BFADBEE57BD1AF591F12B4A0A` | `762A691507CC0479BDA763D19535349BC21602D21771266A8CDCC76BFD7C2803` | New Lavish palette + semantic separation; type/control tokens retained |
| `src/modules/vision/CameraScene.tsx` | `CC86C01A1D80306468E0069A49A3694A7B96481B31E8DB5E4D09B65ED93F1831` | `ED16D70B6D600293E19E2165810F60556F436258E034150FBD3AFB3177606AAB` | **Display text only**: 3D sign changed from SILLAGE to LAVISH / PERFUMES · DUBAI. No 3D business logic was changed. The component is retained but not mounted in recorded-video mode. |
| `index.html` | (old SILLAGE title) | `8D6C1C3A251F29FD34181059871C98C05739DE5AC532FBA916780B0FE8C5FDD5` | Lavish title/description/theme color |
| `public/favicon.svg` | old S-shaped mark | `A03C44F8122CBC98A3B73933F5350C3F3C20FB3920262C766431C455AFC7DCCA` | Temporary gold “L” mark |
| `package.json` / `package-lock.json` | `sillage-live-vision` | package name `lavish-retail-intelligence` | Metadata brand cleanup only |
| `README.md` | old SILLAGE README | `16A21FF8AA103E999F2D46B553BC99242990CD9C818502596FE67D7ECCF37F22` | New run/model/boundary instructions |
| `scripts/analyze_lavish_video.py` | **new** | `EDE2606F6E4F305AE46BD7B08743AD718D34391E388C99ED7C27A4DB2D461C38` | Real YuNet + SFace batch pipeline |
| `src/modules/vision/videoAnalytics.ts` | **new** | `20A4D1553AE2B26965B839DD832B8FC5228D5FCFF66EC6135DF3D100846BC0A7` | Timeline loading, interpolation, time-derived UV/events |
| `src/modules/vision/FaceOverlay.tsx` | **new** | `07867A5FCE26A98BEFA172125857131627641B977A1767420EC1D7626824CC8E` | SVG overlay, collision-resolved labels, trails, empty state |
| `public/demo/lavish-mall.mp4` | **new** | `B274A8C01229498F3064268505F3D74FDD0A612EA103BD1CCAB2F0292FF9225C` | Copy of supplied real clip (9,891,110 B) |
| `public/demo/face_uv_metrics.json` | **new** | `2C04320DD2559553AB43A4C81CE3169A1E703C59A05118BB9D91044DBC7C4170` | Model provenance, counts, thresholds, QC, limits |
| `public/demo/face_uv_timeline.json` | **new** | `A5C3AC9543D2132F593CC8DC0775C86F3A51E503080435E2A8B4A9EEA8359797` | 257 per-sample detections |
| `scripts/models/face_detection_yunet_2023mar.onnx` | **new** | `8F2383E4DD3CFBB4553EA8718107FC0423210DC964F9F4280604804ED2552FA4` | Official OpenCV Zoo weights (232,589 B) |
| `scripts/models/face_recognition_sface_2021dec.onnx` | **new** | `0BA9FBFA01B5270C96627C4EF784DA859931E02F04419C829E83484087C34E79` | Official OpenCV Zoo weights (38,696,353 B) |
| `evidence/lv05-brand/**` | **new** | — | QA, before/after screenshots, model audit, brand/token documentation |

### 2.2 Unchanged protected files

| File | SHA256 | Meaning |
|---|---|---|
| `src/design/components.tsx` | `FC0EF7771B7A1FB758985FDEC702524BC87938DF0A8D82BC8B192C29E1938855` | Dialog/Button/Metric/Status contracts unchanged from LV05 |
| `src/modules/vision/VideoOverlay.tsx` | `DE78C4BE416F9056232B3FAD5849F6F04A1E0FD893C3FCD57DD3681EE88AED54` | legacy 3D overlay untouched |
| `src/domain/replay.ts` | `2305400F601A64E49CE71C85471CD125B26011C2168A7D37ACFE0654958B70CF` | deterministic business fixture/tests untouched |

The old 3D scene is no longer imported by `App.tsx`; that is why the build emits an empty `scene-engine` chunk. Its source and logic remain, and the sign image was rebranded to remove the old name. This is a recorded-video mode, not a claim that the 3D scene is the real camera.

---

## 3. Brand system

Reference: `LAVISH_Retail_Intelligence_Design_Pack.zip` → `BRAND_HANDOFF.md`, `LAVISH_Overview_1440x900.png`. Full old→new mapping: [`evidence/lv05-brand/BRAND_TOKEN_MAP.md`](evidence/lv05-brand/BRAND_TOKEN_MAP.md).

| Role | Old LV05 | New |
|---|---|---|
| Canvas / paper | `#F5F2EB` / `#FCFAF6` | `#F6F5F2` / `#FFFEFC` |
| Brand black / deep | `#171916` / `#232620` | `#191917` / `#262725` |
| Gold accent / readable gold | `--brass #B9A27D` | `#B89A61` / `#816333` |
| Ink / muted | `#232521` / `#666B61` | `#252521` / `#6B6961` |
| Semantic good / danger | `#60715E` / `#AC5147` | `#207C69` / `#A84A40` (darkened from concept `#BE5F54` to keep small error text ≥4.5:1) |
| Borders | `#DCDED3` | `#E8E5DF` |

Typography and control tokens are unchanged from LV05 (body 16, controls/nav 15, metadata 14, primary controls 44, common 40). Metric numerals now use DM Sans at 500 weight for data legibility; page heading keeps the Lavish editorial serif.

Component consistency: Header, Sidebar, KPI cards, video workspace, replay console, identity rail, provenance cards, chart panel, footer, dialogs and drawers all consume the same tokens. There is only one implemented routed business page in this LV05 codebase (Live Vision); other sidebar destinations remain explicit **Concept preview** dialogs and were not fabricated as pages.

Logo: official Lavish bilingual logo files were not supplied. The header uses a **temporary gold “L” monogram + LAVISH wordmark**, and the footer visibly states **Temporary wordmark · official logo pending**. This is not presented as an official logo asset.

All `SILLAGE` occurrences were removed from `src/`, `public/`, `index.html`, `README.md` and package metadata; the 3D sign texture string was also changed. The QA check `3.scope` asserts there is no SILLAGE text in the rendered body.

---

## 4. Real video integration

### 4.1 Single video element, one time source
`src/App.tsx` owns one `<video ref={videoRef} src="/demo/lavish-mall.mp4" muted playsInline loop>`. Expanding/collapsing only changes layout (`focus` state) and keeps the same DOM node. The custom hook/event listeners update `videoTime` from `video.currentTime`; detection boxes, current face count, cumulative Face UV, identity events and chart all derive from that number. No `setInterval` counter and no random face data.

### 4.2 Playback and controls
- Play/pause (video click and transport button), range scrub, 0.5×/1×/2× speed, loop toggle, restart, Detection and Trails toggles.
- `video.loop` is the loop mechanism; when it wraps to 0 the derived confirmed set becomes empty automatically.
- The workbench header/rail show `RECORDED DEMO / ANALYSIS REPLAY`, `SAMPLE MALL FOOTAGE · NOT A LAVISH STORE`, model sampling and metric boundary.
- A visible play hint appears only before first interaction; after any play/seek it is removed.

### 4.3 Overlay geometry
- SVG viewBox is `0 0 1280 720`; video is `object-fit: contain`; both use the same box and aspect ratio, so boxes stay aligned at every size and in the expanded workbench.
- At 10 fps model sampling, boxes are interpolated between adjacent samples for visible IDs; stale boxes are not shown beyond the sample window.
- Collision handling moves only label chips/leader lines; detection rectangles remain raw model projections.
- Verified at 1440: SVG rect equals video rect exactly; projected box error at 12 s `dx 0.60 px / dy 0.07 px / dw 0.11 px`.
- At 390 px, label text chips are suppressed to avoid unreadable 7 px text; green detection boxes remain and the identity rail carries IDs. This is a deliberate small-screen legibility choice.

---

## 5. Face UV / dedup replay

The model output defines `confirmed_at_ms` per anonymous identity and 6 confirmation events. Frontend logic:

```text
faceUvAt(t)   = count(events where video_time_ms <= t)
eventsAt(t)   = events where video_time_ms <= t
visibleFaces(t) = interpolated observations around t
```

Seeking backward/forward recomputes the set; it never uses a monotonic counter. The UI explicitly says "Rebuilt from video time".

### Verified regression (real browser)

| Test | Observed |
|---|---|
| Direct play to 20 s | Face UV **6**, 6 identity events, 6 rail rows |
| Seek to 5 s | Face UV **2** (ANON-002 at 1.2 s, ANON-003 at 3.3 s) |
| Then seek back to 20 s | Face UV **6**, identical event set to direct play |
| Loop after 25.1 s | Wraps to ~0.5 s; Face UV **0**, no accumulation from previous cycle |
| Expand while playing | Same video DOM node, playback continued, no second video, UV time-derived |
| Two expand/collapse cycles | One `<video>`, UV matches expected at current time |
| Identity drawer | ANON-004, 10.1 s, 90% detection, 4-sample support, metric-role line |
| Help drawer | body lock, Tab trapped, Esc returns focus to trigger |

---

## 6. Real model inference evidence

Full audit: [`evidence/lv05-brand/model/README.md`](evidence/lv05-brand/model/README.md), [`audit-uv.log`](evidence/lv05-brand/model/audit-uv.log), [`analysis-run.log`](evidence/lv05-brand/model/analysis-run.log).

- Input: 1280×720, 29.97 fps, 769 frames, 25.66 s (despite the `1920_1080` filename).
- Models: official OpenCV Zoo **YuNet 2023mar** (`8F2383E4…`, 232,589 B) and **SFace 2021dec** (`0BA9FBFA…`, 38,696,353 B). Direct GitHub LFS downloads failed at TLS level in this environment; both files were obtained from official Zoo mirrors (Hugging Face / hf-mirror) and verified by SHA256 and by loading them in OpenCV before inference. No model result was fabricated.
- Runtime: Python 3.12.1, OpenCV 5.0.0, NumPy 2.2.6; 10 fps sampling; detection threshold 0.88; min face 44 px; SFace cosine threshold 0.45; local gate 0.30/1.0 s/1.2×; confirmation ≥4 samples and ≥0.6 s.
- Result: **8 candidates → 6 confirmed**, 2 excluded (ANON-001 edge/3 samples; ANON-008 5 samples but only 0.40 s). 165 raw detections, max 3 faces in one frame. The 6 confirmation events occur at 1.20, 3.30, 10.11, 12.91, 14.01 and 14.51 s; total Face UV reaches 6 and stays 6.
- Audit: no duplicate anonymous ID in a sampled frame; all time-overlapping confirmed pairs are spatially separate (max IoU 0); highest embedding similarity 0.512 between ANON-004/006, but they co-exist at 13.7 s at different positions and are retained as separate people. Manual checks at 0/1/3/5/10/12/14/16/18/20/24/25 s confirm detections correspond to visible frontal faces; children, back-of-head and distant/turned-away people are missed.
- Privacy: only anonymous IDs, boxes, timestamps and statistics are written. No face crops, embeddings or real identities are persisted; no third-party upload.

---

## 7. Business data isolation and preserved behaviour

This LV05 codebase's existing business demo is the synthetic camera fixture: Entries / Exits / In store / Distinct tracks (there are no implemented Footfall/Store UV/UC/trend pages in this repo; no such pages were fabricated). The new page preserves that fixture at a fixed **00:24 snapshot** (03 / 01 / 08 / 05), labelled:

`SYNTHETIC STORE DEMO · FIXED 00:24 SNAPSHOT · UNCHANGED LV05 FIXTURE`
`NOT DERIVED FROM THE VIDEO · Measurement boundary`

- Store selector still switches the synthetic fixture (Dubai Mall ↔ Mall of the Emirates) and changes those values only; it does not touch video time or Face UV.
- Playing the video to 20 s leaves the business values unchanged.
- Video playback state never writes to domain/replay fixtures, and no video metric is labelled Footfall, Store UV, UC or staff.
- The old synthetic event rail was replaced by the new **Identity events** rail because the observed module is now the recorded clip; this is the one intentional UI replacement needed to show model evidence. The original synthetic KPI data and selector are preserved.

---

## 8. Screenshots

All after screenshots are real Chromium captures from the production build (`index-BAVQVCh8.js` + `index-xXeOVCAr.css`), DPR 1 / 100%. Conditions and full metadata are in [`qa-results.json`](evidence/lv05-brand/qa-results.json). Before images are the pre-change LV05 build at the same resolutions.

### Before (old 3D synthetic Live Vision, SILLAGE sign / footer)

| File | SHA256 |
|---|---|
| `before/lv05-before-1920x1080.png` | `D490919FDBFD1272988AED132AD7B4357023FF303BCE648ACA518BC76E63BEB0` |
| `before/lv05-before-1440x900.png` | `D2408F17B1FB746AAC7953A5C51AD3B0502AEDA804B35AEAD5389DF7E47AC7DF` |
| `before/lv05-before-1366x768.png` | `2675CC7D77452DA67C442F836498F6C6A4939CF48D4DE4C35BDF7A31556A4114` |

### After — desktop small preview / expanded / overview

| File | Viewport / state | SHA256 |
|---|---|---|
| `after/overview-1920x1080.png` | 1920×1080 full page, 12.0 s | `95AF77F829B7CBE217A5F2F944DF4F4804CCF4F80A025EAE012BA6359595A223` |
| `after/livevision-small-1920x1080.png` | 1920 viewport, video preview, 12.0 s | `BBD5A9B76F84D1FA5859180CA5E1EAF965813B0BEE99EF6843DC153573D37213` |
| `after/livevision-expanded-1920x1080.png` | 1920 expanded workbench, 12.0 s | `48E74F72897404CCB941B43FFF19CC73AEC67D211D7D58AD3C5F5E7F965B3EFC` |
| `after/overview-1440x900.png` | 1440×900 full page, 12.0 s | `FB16B4ACA0568850CE7769D9D6265790C9955424AC08C0E17DF1D4A692845C7E` |
| `after/livevision-small-1440x900.png` | 1440 viewport, video preview | `F23082446DB100A9A84638B485010395D7886166CB2D4ACB230C8B114952C3A6` |
| `after/livevision-expanded-1440x900.png` | 1440 expanded workbench | `875917BBAF9E688873D5467E681BC5A3DD345153894712B41792018664C92EE9` |
| `after/overview-1366x768.png` | 1366×768 full page, 12.0 s | `00EBC6E9DBF523227B7D68072B2AC3E5DCFCAF13304F562620FB7E3D54D44C50` |
| `after/livevision-small-1366x768.png` | 1366 viewport, video preview | `32237480A42D97079DBA9CF9B8E7235D3244485491D261A432593D0313B2955F` |
| `after/livevision-expanded-1366x768.png` | 1366 expanded workbench | `4362E139AA13C6161C4933383BFA1A972DBCFBDC0515204DCFF4F87117791968` |

### After — evidence states

| File | Condition | SHA256 |
|---|---|---|
| `after/livevision-12s-detection-1440x900.png` | 12.0 s, two confirmed faces, labels/trails | `A4500BB390C4AC418C2495D9F6C7977BC8085D6B0113E1E2989D2E59C273A5C1` |
| `after/livevision-20s-uv-1440x900.png` | 20.0 s, Face UV 6, 6 identity events, no current faces | `9C490E2F683A68BA8DA2C6C5A27728728C17563691B224ABF4C8A6A35BC1AE5E` |
| `after/livevision-expanded-during-play-1440x900.png` | playing, expanded, detection overlay | `005B127A3ECA2E2A952D8C83B4BD8EF805AE1CB89A60543ECA398C8462450A6F` |
| `after/help-drawer-1440x900.png` | measurement boundary help drawer | `F7BF905B0FD09D6750C4EEFB2B248C056C6EC04765F9DF7397548A4F2D133B3C` |
| `after/identity-drawer-1440x900.png` | identity evidence drawer | `3FA45380BEEFBEC33D8C7EBE72A939288D7996C03BD23D03BC14273C4DCED452` |
| `after/overview-390x844.png` | mobile full page, 12.0 s | `072E0D080F427098AE42E81DF32790A16B92E42C35E03AAEEBA5B13F99751706` |
| `after/livevision-small-390x844.png` | mobile video preview | `24552A301B4942276AF11A9293D7269B3DB303021152B5259A86C53E6C7B71C8` |

---

## 9. Commands, exit codes and build artifacts

| Command | Exit | Result |
|---|---|---|
| `python scripts/analyze_lavish_video.py --video public/demo/lavish-mall.mp4 --models scripts/models --output public/demo` | **0** | 257 samples, 8 candidates, 6 confirmed, 6 events; model log saved |
| `npm run build` | **0** | TypeScript + Vite production build |
| `npm test` | **0** | Vitest 3.2.7, **7/7** domain tests |
| `node evidence/lv05-brand/qa-video.cjs` | **0** | **21/21 PASS**; Chromium 145.0.7632.6; zero page/console/request errors |

Final build assets:

| Asset | Bytes | SHA256 |
|---|---:|---|
| `dist/index.html` | — | `E36F9944EEDF01330FBD0BC4AF298B74C6918786D5D32EE71F68DADA8D28B13A` |
| `dist/assets/index-xXeOVCAr.css` | 55,697 | `7D6E30C33F0635F4631805208A8BD336169C2AD327DC89E19B204AB5BE28FD5C` |
| `dist/assets/index-BAVQVCh8.js` | 270,817 | `E686514622A396CC596592A0E1EA6BCDB2D40E76CE1980A0AF7C65460A27C040` |
| `dist/assets/scene-engine-l0sNRNKZ.js` | 1 | empty chunk — 3D scene intentionally not imported |

QA highlights: direct 20 s vs 5 s→20 s equality; loop reset; repeat expand; single video; business isolation; box projection <1 px; help focus trap/body lock; 1920/1440/1366/390 no overflow; no console errors. Full check list is in `qa-results.json`.

---

## 10. Known limitations / blockers

1. **The footage is not Lavish store CCTV.** It is unspecified sample mall footage. UI says this in the video overlay and provenance.
2. **Recognizable Face UV = 6 is not store UV/UC/footfall.** Only frontal, sufficiently large, repeatedly detected faces are counted; turned-away/distant/occluded people are missed and a person could be split. The UI and JSON carry this boundary.
3. **No live camera / real-time inference.** This is an offline batch analysis and recorded replay; no live stream, camera API, identity lookup, cross-store re-ID or employee recognition.
4. **Official logo not supplied.** Temporary wordmark/monogram is used and visibly labelled pending; no claim of official VI compliance.
5. **Business pages.** This LV05 repo contains only the Live Vision page plus synthetic camera KPI fixtures; there are no Footfall/UV/UC/trend pages to preserve or brand. No replacement business pages were fabricated. Nav destinations remain concept previews.
6. **Old synthetic event stream replaced.** The observation rail is now the real Identity events rail; the synthetic camera KPI values/selector are retained. This was necessary to show model evidence in the Live Vision module.
7. **3D scene not mounted.** Source retains it (and its logic); its sign text was rebranded. Recorded-video mode intentionally does not render it, so the build's `scene-engine` chunk is empty.
8. **Small-screen labels.** At 390 px, SVG ID chips are hidden because the scaled text would be unreadable; boxes and the identity rail remain. Arabic/RTL is not implemented.
9. **Model weights access.** Direct GitHub LFS/raw downloads failed with TLS/EOF in this environment; official Zoo weights were fetched from Hugging Face/hf-mirror and verified by SHA256. This is documented rather than hidden.
10. The pre-change build already carried a “LAVISH” header, but the old 3D scene/footer still contained SILLAGE; the before screenshots document that actual starting state.

## 11. Declaration

This pass actually edited and ran the project: real models were executed, the production build and tests were run, and screenshots/QA output were captured. No model count is hardcoded in the frontend; the UI reads `face_uv_metrics.json` and `face_uv_timeline.json`. No claim of official Lavish logo, live CCTV, real customer identity or store UV is made. Visual approval remains with Astra/the visual owner.
