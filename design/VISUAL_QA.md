# Live Vision · QA record and acceptance procedure

Review date: 2026-11-02, Asia/Shanghai. Screen date is intentionally fixed to a different synthetic baseline (2026-10-31, Asia/Dubai).

Status: **engineering checks passed; visual baseline candidate; human acceptance pending**. No numeric self-score is used as approval. The breakdown prompt and remaining business pages remain deferred.

## Verified environment

Windows, Node 22.22.2, Vite production build, Chromium 145.0.7632.6 through Playwright 1.58.2, device scale 1. Final browser QA targets the built static app on local port 5174, independent of Vite hot reload. All captured images are real browser output.

## Checks

- `npm run build`: passed TypeScript strict checking and production bundling. Scene engine and app are separate chunks; no oversized-chunk warning in the final build.
- `npm test`: **7 tests passed**. Exact crossing/position alignment, rewind/reset determinism, duplicate ID/session suppression, repeat-crossing explanation, camera/scenario isolation, offline data absence, physical aisle routing.
- `npm run qa`: **44 browser checks passed**, **16 screenshots**. Exact results in `screenshots/browser-qa-results.json`.
- Browser results include zero uncaught page errors and zero external runtime network requests. A loaded session remains interactive with browser network disabled.

## Layout measurements

Measurements below are from the final default desktop layout with the event rail open. Camera share is camera/controls column width divided by the available work surface, including the inter-column gutter.

| Viewport | Work surface width | Camera width × height | Camera share | Horizontal overflow |
| --- | ---: | ---: | ---: | --- |
| 1920 × 1080 | 1764px | 1305 × 625px | 74.0% | none |
| 1440 × 900 | 1300px | 957 × 460px | 73.6% | none |
| 1366 × 768 | 1242px | 916.5 × 360px | 73.8% | none |

Camera, transport and core measurements remain in the main viewport. Camera network and supplemental note/footer can require vertical scrolling; this is intentional to preserve image and typography scale. Both viewport-sized and full-page images are supplied. Mobile 390 × 844 stacks the reading experience and also has no horizontal overflow.

## Functional browser coverage

Route entry; baseline counts; exact 24-second snapshot at three sizes; camera width agreement with controls; separate overlay/trail toggles; reset; step-event timestamp; 2× shared clock; pause; seek rewind; completed clip restart; event filters; panel and camera-list collapse; navigation expanded/hidden; focus and Escape; repeated crossing suppression; event details; identity definitions and modal Escape; camera switch; offline device; peak flow; no-network operation; mobile layout; guided walkthrough.

## Reproduce

1. `npm run build`.
2. Start `node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 5174`.
3. In another PowerShell: `$env:QA_URL = 'http://127.0.0.1:5174'`, then `npm run qa`.
4. Review PNGs and JSON measurements in `design/screenshots/`.
5. Independently inspect playback and focus mode in an interactive browser. Automatic checks do not replace visual judgment.

## Human acceptance questions

- Does the warm editorial shell / dark camera instrument feel appropriate for the customer's luxury retail brand?
- Is the deliberately synthetic architectural scene suitable for this sales stage, with the source label clearly understood?
- Are control, event, and measurement sizes comfortable on the presentation screen at 100% zoom?
- Do camera-first composition, focus mode and the explanatory drawer tell the intended business story?

Only after that acceptance should tokens/layout/interaction rules be formally frozen and the deferred engineering breakdown begin. This candidate is not a production camera platform or an accuracy validation.
