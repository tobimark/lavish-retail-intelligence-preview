# LV05 — Compact Store Overview hero/toolbar

- Status: **Implemented and verified in real Chromium at 1920×1080 / 1440×900 / 1366×768.**
- Scope: top title + filter/export toolbar spacing and layout only. No business logic, data, model, video or other module changes.
- Type scale is unchanged: H1 29px; subtitle 13px; eyebrow 11px; simulated badge 10px; controls 39px.

## 1. Before / after geometry

Measured from `.content` top to `.stats` (KPI row) top:

| Viewport | Before KPI top | After KPI top | Region reduction |
|---|---:|---:|---:|
| 1920×1080 | 259.875 px | 198.875 px | **33.4%** |
| 1440×900 | 253.875 px | 198.875 px | **31.1%** |
| 1366×768 | 253.875 px | 198.875 px | **31.1%** |

The title block itself went from **121.875 px** to **83.875 px**. Roughly **55–61 px** of vertical space was returned to the KPI cards and Live Vision above the fold.

## 2. What changed

- `.content` top padding: **33px → 22px**.
- `.titleline` bottom margin: **28px → 16px**.
- The simulated-data badge moved into the eyebrow row instead of occupying its own line:
  - new `.eyebrow-row` with 5px bottom margin;
  - badge height **19px**, 2px/7px padding, 10px font kept.
- Subtitle margin-top: **10px → 5px**.
- Eyebrow bottom margin: **11px → 0** (the row owns spacing).
- Right toolbar:
  - all four controls remain **39px tall** and share the exact same top/bottom;
  - actions are bottom-aligned to the title block, no overlap with title copy;
  - gaps tightened 9px → 8px.
- No font size, font family, color, card size or overall layout changed.

## 3. Verification

`node evidence/lv05-brand/title-qa.cjs` — **16/16 PASS**:

| Check | 1920 | 1440 | 1366 |
|---|---|---|---|
| Title region reduction 25–35% | 33.4% | 31.1% | 31.1% |
| Four controls same 39px row, right-aligned, no overlap | ✓ | ✓ | ✓ |
| H1/subtitle/eyebrow/badge font sizes unchanged | 29/13/11/10px | same | same |
| Badge one line, 19px height | ✓ | ✓ | ✓ |
| No horizontal overflow; KPI moved up | ✓ | ✓ | ✓ |

Regression after the compaction:

- `qa-home.cjs` — **32/32 PASS**
- `sidebar-qa.cjs` — **20/20 PASS**
- `npm test` — **7/7 PASS**
- `npm run build` — **0**

## 4. Screenshots

Before/after at the same resolution:

| Viewport | Before | After |
|---|---|---|
| 1920×1080 | `title-before-1920x1080.png` — `B86E804B…` | `title-qa/title-after-1920x1080.png` — `D1BCA47D…` |
| 1440×900 | `title-before-1440x900.png` — `DF9547E1…` | `title-qa/title-after-1440x900.png` — `A515DC71…` |
| 1366×768 | `title-before-1366x768.png` — `F3741D23…` | `title-qa/title-after-1366x768.png` — `899849EB…` |

Toolbar-only crops:

- `title-qa/title-toolbar-1920x1080.png` — `BE452E84…`
- `title-qa/title-toolbar-1440x900.png` — `D7215FA5…`
- `title-qa/title-toolbar-1366x768.png` — `442B39D2…`

## 5. Files / build

| File | SHA256 |
|---|---|
| `src/App.tsx` | `3F817511C14B44D86CFFD19D058CC89D365B57A01B9740B91D62B553A3A7F6D9` |
| `src/styles.css` | `16B0875865F05D9A4E9C80E5759943E097EAB8307C92EFA1A7297EC5FAFAF73F` |
| `dist/assets/index-ad02HyQG.css` | `D4AA9DA0ECC4CCF457125A4D497D4207EC65887A645F87A1E7E6A401616D651B` |
| `dist/assets/index-C6Ogat1d.js` | `8A827E17DC95D21F3191D290FB22C54345DF589978055B489FE4CDAB059BA75A` |
| `dist/index.html` | `3C3B00C681B1D9CF88FB66A5DBC78AF3A8E5A900BA05CCC9030AC1B7A7C471BD` |

Unchanged: `src/data/overview.ts` (UC/KPI data), `src/data/videos.ts`, model JSON/videos, Sidebar behavior and other modules.
