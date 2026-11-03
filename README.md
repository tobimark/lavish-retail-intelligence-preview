# LAVISH Retail Intelligence

Lavish Perfumes retail-intelligence concept built from the approved reference homepage (`extended/LAVISH_LiveVision_RealVideo_Demo.html`), with two switchable simulated business datasets and a real recorded-video Live Vision module.

The business data is **simulated**. The mall clip is sample footage, **not Lavish CCTV**, and the anonymous **Recognizable Face UV** is a model result for this clip — not store UV, UC, footfall, staff identity, or cross-store re-identification.

## Run

Validated on Windows / Node 22.22.2 / Chromium 145.

```powershell
npm install
npm run dev
```

Open the local URL (`http://127.0.0.1:5173/`). Production preview:

```powershell
npm run build
npm run preview
```

`dist/` is a static build and must be served over HTTP. The demo needs no backend, camera API, external service or network access at runtime: the Lavish app icon ships locally in `public/brand/lavish-app-icon.png`, with the bilingual `LAVISH · PERFUMES` fallback kept behind it.

## Homepage

- Reference Overview layout: dark Lavish sidebar, light canvas, four KPI cards, smooth Footfall & Visitor Trends, Visitor Composition, Live Vision card, Intelligence Highlights and Network Snapshot.
- **DATA A / B** switch in the title actions changes the full business dataset: KPIs, chart, composition and Network Snapshot.
  - **A — Brand Concept:** Total Footfall 1,842 / UV 1,506 / **UC 1,329** / Repeat 18.2%.
  - **B — Alternate Scenario:** independently generated second fictional dataset: Footfall 2,164 / UV 1,712 / **UC 1,498** / Repeat 21.6%, with its own composition, trend shape and network rows.
- Store and period selectors recompute the selected dataset; Visits/Unique chart tabs and the CSV export follow the active selection.\n- **Unique Customers (UC)** is an independent simulated field after staff exclusion, not a copy or fixed ratio of UV; the four KPI cards are Footfall / UV / UC / Repeat.
- All business figures carry `SIMULATED · DATASET A/B` and the concept-demo note.

## Live Vision

- The homepage card autoplays the real recorded clip (`public/demo/lavish-mall.mp4`) with real YuNet/SFace detection boxes and live Face UV HUD.
- Switching to **Dataset B** changes the card and expanded workspace to the second clip (`public/demo/lavish-mall-b.mp4`) and its own model timeline: a **10.04 s AI-generated store-entrance clip**, 4 confirmed anonymous faces, labelled `AI-GENERATED STORE FOOTAGE`.
- Clicking the card or **Live Vision** opens the expanded recorded workbench using the **same `<video>` element**: play/pause, seek, 0.5×/1×/2×, loop, restart, Detection/Trails, timeline event ticks and Identity events.
- All analysis state derives from `video.currentTime` and the model timeline. Seeking/looping rebuilds the confirmed set; there is no random or increment-only counter.
- Key regression: direct 20 s and 5 s→20 s both give **Face UV 6**; loop resets to 0. Expand/collapse preserves one video and playback position. Esc closes and restores body scroll.
- Each dataset carries its own clip and model JSON; switching A/B swaps the video source and resets to that clip’s start. The analysis for each clip remains derived from its own timeline.

## Real model run

```powershell
python scripts/analyze_lavish_video.py --video public/demo/lavish-mall.mp4 --models scripts/models --output public/demo
```

- OpenCV YuNet 2023mar + SFace 2021dec, 10 fps sampling, temporal/spatial association, cross-time appearance matching.
- Actual result for Dataset A: **8 candidates → 6 confirmed recognizable faces**, 6 confirmation events, 2 low-support tracklets excluded.
- Actual result for Dataset B: **5 candidates → 4 confirmed recognizable faces**, 4 confirmation events, 1 low-support tracklet excluded. Dataset B video/model audit: `evidence/lv05-brand/model/dataset-b/README.md`.
- `public/demo/face_uv_timeline.json` and `face_uv_metrics.json` (A), `face_uv_b_timeline.json` / `face_uv_b_metrics.json` (B) are the app’s source of truth.
- Model provenance, SHA256, audit and limitations: `evidence/lv05-brand/model/README.md`.
- No face crops, embeddings or real identities are persisted.

## Deployment (Vercel)

The project is a Vite static SPA, so Vercel needs no serverless inference:

- framework: Vite; build: `npm run build`; output: `dist`
- `vercel.json` adds a `/live` → `index.html` fallback.
- `.vercelignore` keeps model weights, evidence, `extended/`, `tasks/` and `design/` out of the deployment; the runtime needs both clips and the four model JSON files under `public/demo/`.
- Do not run OpenCV/SFace inside Vercel Functions; keep the Python analysis offline and deploy its JSON output.

## Verification

```powershell
npm run build
npm test
node evidence/lv05-brand/qa-home.cjs   # preview server on :4173
```

- Unit tests: 7/7.
- Homepage + real-video browser QA: **32/32 PASS**, including Footfall/UV/UC/Repeat KPI checks, UC independence, A/B full-dataset switch, Dataset B video/model swap, filters, export, single-video expand continuity, seek/loop dedup, box projection, navigation placeholders, 1920/1440/1366/390 overflow, mobile expanded workspace and zero page/console/request errors.
- Evidence: `evidence/lv05-brand/home-qa/`; report: `LV05_LAVISH_OVERVIEW_REPORT.md`.

## Structure

- `src/App.tsx`: reference Overview port, dataset switch, filters, chart/network, Live Vision card.
- `src/data/overview.ts`: two complete simulated datasets.
- `src/data/videos.ts`: Dataset A/B clip + model JSON mapping.
- `src/modules/overview/TrafficChart.tsx`: hand-built smooth SVG trend chart with tooltip.
- `src/modules/vision/LiveVisionModule.tsx`: one persistent video, compact card and expanded workbench.
- `src/modules/vision/FaceOverlay.tsx`: responsive SVG face boxes/labels.
- `src/modules/vision/videoAnalytics.ts`: time-indexed overlay interpolation and confirmed-set derivation.
- `src/styles.css`: reference homepage styles + Live Vision extension.

## Known limits

- All Footfall/UV/UC/Repeat figures and the Network rows are simulated, including Dataset B (generated for this demo, not client data). Service Coverage remains in the Network table/Insights/CSV pending confirmation, and is no longer a homepage KPI.
- Face UV only counts sufficiently large, repeatedly detected, front-visible faces; turned-away/distant/occluded shoppers are missed. Dataset B is an AI-generated clip with a visible Chinese watermark, not Lavish CCTV.
- App icon artwork is bundled from the public App Store listing (`public/brand/lavish-app-icon.png`) as supplied; reuse permission remains pending.
- Other navigation destinations are concept placeholders from the reference page, not implemented business pages.
- Arabic/RTL is not implemented.
