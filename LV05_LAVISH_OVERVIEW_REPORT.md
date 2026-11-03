# LV05 — Lavish Overview homepage + Dataset A/B recorded Live Vision\n\n> **Latest update:** homepage KPI now uses **Unique Customers (UC)** instead of Service Coverage; see [`LV05_KPI_UC_AND_UI_REPORT.md`](LV05_KPI_UC_AND_UI_REPORT.md) for current values/hashes.

- Status: **Implemented and verified locally; ready for Astra / visual-owner review.** Not an approval.
- Confirmed direction: React port of `extended/LAVISH_LiveVision_RealVideo_Demo.html` as the homepage; two switchable simulated business datasets; **Dataset A and B each use their own real clip + model JSON**; remote published App Store icon; other navigation modules remain reference-style placeholders.
- Supersedes the earlier `LV05_BRAND_REAL_VIDEO_REPORT.md` layout attempt.

---

## 1. What changed

| Reference HTML element | React implementation |
|---|---|
| Dark sidebar, brand area, nav counts, collapse, user block | `src/App.tsx`, lucide icons, remote icon + local fallback |
| Topbar breadcrumb, search, bell, profile | React topbar, store search prompt, simulated toast |
| Store/date filters, Export | Controlled selects, dataset-aware CSV export |
| Four KPI cards | Dataset/store/period-driven values and deltas |
| Smooth gold Footfall & Visitor Trends + tooltip | `src/modules/overview/TrafficChart.tsx` |
| Visitor Composition bars/donut | Dataset-driven percentages |
| Dark Live Vision card | `src/modules/vision/LiveVisionModule.tsx` — real clip, model boxes, Face UV |
| Intelligence Highlights / Network Snapshot | Reference copy / dataset-driven table |
| Camera modal | Expanded in-place workbench using the **same `<video>`** |
| Placeholder modules | Reference-style empty modules; Reports export works |

### A/B datasets — full-page switch

**DATA A / B** sits in the title actions. Switching changes KPIs, chart, composition, Network Snapshot, CSV source, **and the Live Vision clip + model JSON**. Each clip has its own model run.

| | Dataset A — Brand Concept | Dataset B — Alternate Scenario |
|---|---|---|
| Business values (Ajman) | 1,842 / 1,506 / 18.2% / 86.4% | 2,164 / 1,712 / 21.6% / 84.1% |
| Dubai Al Jaddaf | 1,565 / 1,275 / 83.1% | 1,798 / 1,402 / 81.8% |
| Al Ain Al Yahar | 1,239 / 1,051 / 81.9% | 1,352 / 1,112 / 79.6% |
| Composition | 66/20/14 | 61/24/15 |
| Video | `public/demo/lavish-mall.mp4` — 25.66 s sample mall footage | `public/demo/lavish-mall-b.mp4` — 10.04 s AI-generated store-entrance clip |
| Model result | 8 candidates → **6 confirmed Face UV**, 6 events | 5 candidates → **4 confirmed Face UV**, 4 events |
| Video label | `SAMPLE MALL FOOTAGE · NOT A LAVISH STORE` | `AI-GENERATED STORE FOOTAGE · NOT A LAVISH STORE` |

The second business dataset is fictional and generated for this demo, not client data. The Dataset B clip is the supplied file from `D:\xwechat_files\...\9aaa114de66a984072557260b956e49e.mp4`; it has a visible **“豆包AI生成”** watermark and is **AI-generated sample footage**, not Lavish CCTV.

### Dataset B model run (new)

- Input: 1280×720, 24 fps, 241 frames, **10.04 s**; 121 samples at 10 fps.
- 72 detections across 60 samples; max 2 faces/frame.
- **5 candidates → 4 confirmed anonymous faces**, 1 low-support tracklet excluded.
- Events: ANON-001 @2.83 s, ANON-002 @3.42 s, ANON-003 @5.75 s, ANON-005 @7.58 s; cumulative Face UV reaches 4 and stays 4.
- Manual audit: ANON-001 woman, ANON-002 glasses man/blue T-shirt, ANON-003 bald man/black T-shirt, ANON-005 bald glasses man/light-blue shirt; all visually distinct. ANON-001/002 co-exist in 12 frames. ANON-004 0.25 s tracklet excluded. Highest embedding similarity (ANON-002↔005 0.607) did not override the distinct appearances/time ranges.
- Evidence: [`evidence/lv05-brand/model/dataset-b/README.md`](evidence/lv05-brand/model/dataset-b/README.md), `audit-uv-b.log`, `analysis-run.log`; JSON/video hashes in section 5.
- Same weights/thresholds as A: YuNet `8F2383E4…`, SFace `0BA9FBFA…`; no face crops/embeddings stored.

---

## 2. Live Vision behavior

- Compact card autoplays the active dataset’s clip with real detection boxes, Face UV/Faces Now/clock HUD, dataset-specific source badge and foot line.
- Clicking the card / expand button / Live Vision navigation opens an in-place dark workbench using the **same video element**: play/pause, seek, 0.5×/1×/2×, loop, restart, Detection/Trails, event ticks, identity rail.
- Switching A↔B changes `src` and the model timeline, resets to the new clip’s start and autoplays; there is still only one `<video>` element.
- All analysis state derives from `video.currentTime` and the selected dataset’s `face_uv_*` JSON. Seek/loop rebuilds the confirmed set; no increment-only or random counter.
- Esc/close restores body scroll; expand/collapse/reopen do not create a second video.

Verified regressions:

| Test | Observed |
|---|---|
| Dataset B video switch | `lavish-mall-b.mp4`, duration 10.1 s, nav count 04, AI-generated label |
| Dataset B expanded at 8 s | Face UV **04**, **4 / 4** events, one video |
| Seek 5 → 20 s (A) | UV **2 → 6**, 6 events; equal to direct-play result from earlier run |
| Loop (A) | resets to ~0 s, UV **0**, no accumulation |
| Box projection at 12 s (A) | dx/dy/dw < 2 px |
| Close/reopen/nav Live Vision | one video, body overflow restored |

Model A full audit remains at [`evidence/lv05-brand/model/README.md`](evidence/lv05-brand/model/README.md): 6 confirmed, 2 excluded, sample mall footage.

---

## 3. Deployment

- Vite 7 + React 19 + TypeScript. `vercel.json` (Vite build, `dist`, `/live` fallback) and `.vercelignore` added.
- Runtime static assets only: `public/demo/*.mp4` and the four model JSON files.
- Python/OpenCV runs offline; model weights and inference are **not** deployed to Vercel Functions.
- Remote App Store icon is used at the owner’s request with local fallback; reuse permission remains pending and is stated in the demo note.

---

## 4. Verification

| Command | Exit | Result |
|---|---|---|
| `npm run build` | **0** | Vite production build |
| `npm test` | **0** | Vitest **7/7** |
| `node evidence/lv05-brand/qa-home.cjs` | **0** | **30/30 PASS**, Chromium 145.0.7632.6, zero page/console/local-request errors |

QA covers reference layout, A/B full-dataset switch, **B video/model switch**, B expanded Face UV 04, filters, chart tabs, CSV export, notifications, seek/loop dedup, identity event seek, single-video expand/reopen, navigation placeholders, box projection, 1920/1440/1366/390 overflow and mobile expanded workspace.

### Screenshots (production build, DPR 1 / 100%)

| File | State | SHA256 |
|---|---|---|
| `home-qa/overview-datasetA-initial-1440x900.png` | A, initial card | `EE7D82C288171FD06A2212864BEDCC9E6F3421B1E178532B88CFAF2800688701` |
| `home-qa/overview-datasetA-1920x1080.png` | A full page | `C81AFD69FA061D29922C8933F4F1C3F9F14C8E0848F1550F608A9EC3D679FD77` |
| `home-qa/overview-datasetA-1440x900.png` | A full page | `C39B420E7CD92075D9F912D0D502979E14697EA09A03520C09CBD0B883E970A4` |
| `home-qa/overview-datasetA-1366x768.png` | A full page | `7812943FF00FE320F41C46E5EB4B0845CA9B9F9C134CE0022C9E0001670985C1` |
| `home-qa/overview-datasetA-390x844.png` | A mobile | `04167BC8E226E7668B31D8567A746F3362B007EF98AF7319A69B1C4C48889080` |
| `home-qa/overview-datasetB-1440x900.png` | B full page | `3204F0DF93B01D115714D77D78B14E8247519E6DE4382BA1A104D1DABF5B3507` |
| `home-qa/livevision-expanded-initial-1440x900.png` | A expanded while playing | `7C83E1228D55D7F3B4B73641EAFDE77C65586C29936852A0F1FB482B1647AF10` |
| `home-qa/livevision-expanded-1920x1080.png` | A expanded | `51A32BD81E80D9F4799B109B8D092A1CB26A7957C0E07A20B2585B4DE0D8822D` |
| `home-qa/livevision-expanded-1440x900.png` | A expanded | `C7FB295BB22BAD1DD2C5E583996D5E749F766FA293F7298F41778861824D4798` |
| `home-qa/livevision-expanded-1366x768.png` | A expanded | `52463A6910C8D8FDF81ACE8EA0144C6C975E5D33442F7292190770918D50B474` |
| `home-qa/livevision-expanded-390x844.png` | A mobile expanded | `681CB34048B248E17BE5E945647802F8BBF0D9EB7EF6AF69BA097FD1D76FF8FF` |
| `home-qa/livevision-expanded-datasetB-1440x900.png` | B expanded, 8 s, Face UV 04 | `79B4E47ED7FF346466CF36578DDC920EB55C16A64FF315D1E2F7F4C54BC7486A` |
| `home-qa/livevision-12s-detection-1440x900.png` | A 12 s detections | `FDBCD83F0695199C1809C71640C9078B276464071C6CA59EEF9224F28E59A285` |
| `home-qa/livevision-20s-uv-1440x900.png` | A 20 s, Face UV 6 | `78C91E5D0E4A8852FB5F306795A924184575C396EB3AC7E099F3CC780958E94D` |

Reference target screenshot: `evidence/lv05-brand/reference-html-1440.png` (`14CDCE0F2598FDE15C3D48C9A92F9A762FBB33AD958111F7428BFFE9AFCF7AA4`).

---

## 5. Files and hashes

| File | SHA256 |
|---|---|
| `src/App.tsx` | `0E483E2E337C11DC5AA1C35F65FA0A1A09F4F770A671B863897075902193CFC5` |
| `src/styles.css` | `3C16292A5DEF6113304497AD715CF5FC9408C75F0EF1AE142389546774FDE874` |
| `src/data/overview.ts` | `F9D8907163D81F388F653A59B824E30DEE92C0AA31C51B5E1C902A15F747D1B9` |
| `src/data/videos.ts` | `D60B389498C73015DDE4E254D2EE0ACEF5F8EF8584CE052A38CD45DB673999C2` |
| `src/modules/overview/TrafficChart.tsx` | `468C59BAA111CDC110EA3CFA778A2DD978D717197DBDADCB2C223984672ACEF8` |
| `src/modules/vision/LiveVisionModule.tsx` | `BEA0AF5FAA1D7CE4C77B51486EFFAC87C3D7D4EEB0C6AFF38FBA481B980D7810` |
| `src/modules/vision/FaceOverlay.tsx` | `2B90BCF276FEE6F183DA168C8466182500FE883CDA9EF61A0DC5421B9A4F9A90` |
| `src/modules/vision/videoAnalytics.ts` | `266DFAAAD5B8698176B576104578FA17BBF3DFB9C9523B8CCD0535BD3C4668BB` |
| `src/main.tsx` | `5F97C57C8280D77F2BDC5D90534000B971BD0642F8565786ED82F60432B06555` |
| `index.html` | `E1B61B8D921F6CDEDC1DEC5B6CDC45BED3CA714EA021E0237678423231B790B3` |
| `vercel.json` | `D33293458A956E0A7957AAA2900FCFA91FA9BEBF165CBA3EC07F2D871527B49D` |
| `.vercelignore` | `8B9F5910C6C8B4760766CE3DFA4448D1099DEF6EC4B75BEC35BE691432889362` |
| `README.md` | `0C7D142EBCE36CF312C9D57F5C386EA3361B45BF591BD7384D37B6E9E9B7934C` |

Model/video assets:

| Asset | Bytes | SHA256 |
|---|---:|---|
| `public/demo/lavish-mall.mp4` (A) | 9,891,110 | `B274A8C01229498F3064268505F3D74FDD0A612EA103BD1CCAB2F0292FF9225C` |
| `public/demo/face_uv_metrics.json` (A) | 7,680 | `2C04320DD2559553AB43A4C81CE3169A1E703C59A05118BB9D91044DBC7C4170` |
| `public/demo/face_uv_timeline.json` (A) | 108,754 | `A5C3AC9543D2132F593CC8DC0775C86F3A51E503080435E2A8B4A9EEA8359797` |
| `public/demo/lavish-mall-b.mp4` (B) | 2,145,473 | `4BD7606D9355C57A3E985A51988B44A9AA4686F999980B7664E1CD9B7FFA9536` |
| `public/demo/face_uv_b_metrics.json` (B) | 6,343 | `72F321EC37608F74D58537D84A68BE4BAA6757F9BA169AE82B29D6D72167939C` |
| `public/demo/face_uv_b_timeline.json` (B) | 48,863 | `63E395E7D957EAEDB7B84F418DE1264E1BC89F72577B39E394A884379EB8E4AE` |

Final build:

| Asset | SHA256 |
|---|---|
| `dist/assets/index-DFuL73QI.css` | `88E32EA4912F371ADBC4F661793EECBA603AEB6C653E35DF9DE7F028FD86630A` |
| `dist/assets/index-DZ7GkuAB.js` | `79593F53C6878C268D6740D5BD4F0FD0DDA3EBDE95314FC03470AE759FA63DF8` |
| `dist/index.html` | `C019866F34FA8AD16F729C398E6865B79653B03DA8792DFF44FE46FED8ECB396` |

`src/domain/replay.ts` and `src/design/components.tsx` remain untouched. The legacy 3D scene is retained in source but not mounted.

---

## 6. Known limitations

1. All business KPIs/trends/composition/Network rows are **simulated**, including the independent Dataset B scenario.
2. Dataset B clip is **AI-generated sample footage** (visible “豆包AI生成” watermark), not Lavish CCTV; Dataset A is unspecified mall footage, also not Lavish.
3. Face UV counts are offline model estimates (A=6, B=4), not store UV/UC; only frontal, sufficiently large faces are counted.
4. Remote App Store icon permission is pending; fallback works offline.
5. Other sidebar destinations remain concept placeholders; Arabic/RTL is not implemented.
6. Vercel hosts only the static frontend; Python/OpenCV stays offline or on an external GPU service.

## 7. UI polish\n\nA follow-up UI-only pass fixed the Sidebar native scrollbar, reduced Live Vision compact-card overlay noise, and improved auxiliary-text contrast. Details and before/after sidebars: [`LV05_UI_POLISH_REPORT.md`](LV05_UI_POLISH_REPORT.md).\n\n## 8. Declaration

The reference homepage port, A/B business data switch, per-dataset real clips/model JSON, single-video expanded workbench and Vercel config are implemented and verified. This is not an approval; visual sign-off remains with Astra/the visual owner.
