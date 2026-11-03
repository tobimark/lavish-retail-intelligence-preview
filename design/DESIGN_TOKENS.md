# Design token reference

Source of truth: `src/design/tokens.css`. The CSS file is consumed before all component styles. Scene materials are the sole exception: their colors describe physical objects, not UI states.

| Family | Tokens / values | Use |
| --- | --- | --- |
| Colors | `--ink #232521`, `--muted #666B61`, `--ivory #F5F2EB` | text and brand contrast |
| Colors | `--brass #B9A27D`, `--sage #60715E`, `--clay #A66E55`, `--danger #AC5147` | threshold, entry, exit, failure |
| Dark text | `--muted-dark #B4B8AC`, `--sage-light #BCCDB5`, `--clay-light #E1B49B` | dark instrument and focus mode |
| Surface | `--canvas #F5F2EB`, `--paper #FCFAF6`, `--surface #EEEBE3` | editorial shell and sheets |
| Surface | `--obsidian #171916`, `--deep #232620`, `--elevated #2E322B` | camera instrument and navigation |
| Typography | `--font-display`, `--font-ui`; `--text-xs 10px`, `--text-sm 12px`, `--text-base 13px`, `--text-lg 16px` | shared type roles |
| Numbers | `font-variant-numeric: tabular-nums` | stable alignment during replay |
| Spacing | `--space-1..8`: 4, 8, 12, 16, 24, 32, 40, 48px | rhythm and layout |
| Radius | `--radius-tag 2px`, `--radius-control 4px`, `--radius-panel 8px` | distinct tag, control, floating-surface hierarchy |
| Border | `--border-width 1px`, `--line #DCDED3`, `--line-dark #3B4035` | separators |
| Shadow | `--shadow-float 0 12px 44px #1719161A`, `--shadow-drawer -12px 0 64px #17191629` | transient surfaces only |
| Motion | `--motion-fast 160ms`, `--motion-panel 240ms`, `--ease cubic-bezier(.2,.7,.2,1)` | interaction transitions; no decorative scene clock |
| Z-index | `--z-overlay 10`, `--z-popover 30`, `--z-modal 50` | overlay order; native dialogs use browser top layer |
| Layout | `--header-height 72px`, `--nav-width 76px`, `--nav-expanded 224px`, `--rail-width 280px`, `--gutter 32px` | `rail-width` is a minimum within the 3:1 grid |
| Visualization | `--chart-entry = --sage`, `--chart-exit = --clay` | event/chart semantics |

Responsive adjustments: desktop gutter 24 / 32 / 40px; rail minimum 266 / 280 / 310px. Below 900px the work surface stacks. Below 580px navigation is hidden and metrics become two columns. Main implementation rules are in `src/styles.css`; reduced-motion overrides are last.

The SVG overlay uses high-contrast pale sage and pale clay against the material scene. Its label backgrounds use opaque charcoal to remain readable. Detection confidence is fixture metadata, not validated algorithm accuracy.

Change control: adjust semantic tokens before component overrides. New business pages must not create another color or typography system. Final freeze awaits the user's visual review.
