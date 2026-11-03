// LV03 workspace state QA — real browser behaviour checks for the full-page analysis workspace.
// Run:  node scripts/workspace-state-qa.mjs        (needs `vite preview`/dev server reachable)
// Env:  QA_URL (default http://127.0.0.1:4173/)   QA_OUT (default tasks/V3_1/submissions/LV03)
// Evidence only; this script does not approve the task. It writes screenshots + JSON under QA_OUT.
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';

const baseURL = process.env.QA_URL || 'http://127.0.0.1:4173/';
const outRoot = resolve(process.env.QA_OUT || 'tasks/V3_1/submissions/LV03');
const shotDir = join(outRoot, 'screenshots');
const reportDir = join(outRoot, 'qa');
await mkdir(shotDir, { recursive: true });
await mkdir(reportDir, { recursive: true });

const checks = [];
const logLines = [];
const shots = [];
const log = (s = '') => { logLines.push(s); console.log(s); };
const check = (name, ok, observed) => {
  checks.push({ name, ok: Boolean(ok), observed });
  log(`${ok ? '[PASS]' : '[FAIL]'} ${name}`);
  if (observed !== undefined) log(`        observed: ${JSON.stringify(observed)}`);
};
const sha = async p => createHash('sha256').update(await readFile(p)).digest('hex');

const sourceFiles = ['src/App.tsx', 'src/styles.css', 'src/design/tokens.css', 'src/design/components.tsx', 'src/domain/replay.ts', 'src/modules/vision/CameraScene.tsx'];
const sourceHashes = {};
for (const f of sourceFiles) {
  const s = await stat(f);
  sourceHashes[f] = { sha256: await sha(f), size: s.size, mtime: s.mtime.toISOString() };
}

const distHtml = await readFile(resolve('dist/index.html'), 'utf8');
const distJs = distHtml.match(/src="(\/assets\/[^"]+\.js)"/)?.[1] ?? null;
const distCss = distHtml.match(/href="(\/assets\/[^"]+\.css)"/)?.[1] ?? null;

log('='.repeat(78));
log('LV03 workspace state QA');
log(`startedAt: ${new Date().toISOString()}`);
log(`server: ${baseURL}`);
log(`dist JS: ${distJs}`);
log(`dist CSS: ${distCss}`);
log('='.repeat(78));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const pageErrors = []; const consoleErrors = []; const failedRequests = [];
page.on('pageerror', e => pageErrors.push(e.message));
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('requestfailed', r => failedRequests.push(`${r.url()} ${r.failure()?.errorText}`));

const state = () => page.evaluate(() => {
  const q = s => document.querySelector(s);
  const val = l => [...document.querySelectorAll('.metric')].find(m => m.querySelector('.metric-label').textContent.trim().startsWith(l))?.querySelector('.metric-value')?.textContent?.replace(/[^0-9—]/g, '');
  const toggle = re => [...document.querySelectorAll('.toggle')].find(b => re.test(b.textContent));
  const cam = q('.camera-identity span')?.textContent?.trim();
  const header = q('.workbench-header, .global-header');
  return {
    camera: cam,
    cameraId: q('.camera-id')?.textContent?.trim() ?? null,
    scenario: q('select[aria-label="Replay scenario"]')?.value ?? null,
    atMs: Number(q('input[aria-label="Replay position"]')?.value ?? -1),
    playing: q('.play-state')?.textContent?.trim() ?? null,
    speed: q('select[aria-label="Playback speed"]')?.value ?? null,
    overlay: toggle(/Detection/).getAttribute('aria-pressed'),
    trails: toggle(/Trails/).getAttribute('aria-pressed'),
    metrics: { entries: val('Entries'), exits: val('Exits'), occupancy: val('In store'), tracks: val('Distinct tracks') },
    focused: q('.app').classList.contains('is-focused'),
    headerText: header?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 120) ?? null,
    demoTyped: /DEMO REPLAY/i.test(header?.textContent ?? ''),
    railVisible: !!q('.event-rail'),
    canvases: document.querySelectorAll('canvas').length,
    sameCanvas: q('.scene-render canvas') === window.__qaCanvas,
    scrollY: window.scrollY,
    active: document.activeElement ? { tag: document.activeElement.tagName, cls: String(document.activeElement.className), label: document.activeElement.getAttribute?.('aria-label') ?? null, text: document.activeElement.textContent?.trim().slice(0, 40) ?? null } : null,
  };
});
const core = s => ({ camera: s.camera, scenario: s.scenario, atMs: s.atMs, playing: s.playing, speed: s.speed, overlay: s.overlay, trails: s.trails, metrics: s.metrics });
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const fontsReady = async () => {
  await page.getByRole('heading', { name: 'Live Vision.' }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.scene-render canvas').waitFor();
  await page.waitForTimeout(350);
  await page.evaluate(() => { window.__qaCanvas = document.querySelector('.scene-render canvas'); });
};
const seek = async ms => { await page.locator('input[aria-label="Replay position"]').fill(String(ms)); await page.waitForTimeout(160); };
const setStateForCompare = async () => {
  await page.getByRole('combobox', { name: 'Playback speed' }).selectOption('2');
  await page.waitForTimeout(80);
  const det = page.getByRole('button', { name: 'Show detection overlay' });
  if (await det.getAttribute('aria-pressed') === 'true') { await det.click(); await page.waitForTimeout(80); }
  const tr = page.getByRole('button', { name: 'Show tracking trajectories' });
  if (await tr.getAttribute('aria-pressed') === 'false') { await tr.click(); await page.waitForTimeout(80); }
  await seek(24000);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(80);
};
const capture = async (file, fullPage = false) => {
  const path = join(shotDir, file);
  await page.screenshot({ path, fullPage });
  const s = await stat(path);
  const st = await state();
  const meta = await page.evaluate(() => ({
    url: location.href, viewport: [innerWidth, innerHeight], dpr: devicePixelRatio, scrollY: window.scrollY,
    loadedScripts: [...document.scripts].map(x => x.getAttribute('src')).filter(Boolean),
    loadedStyles: [...document.styleSheets].map(x => x.href).filter(Boolean),
  }));
  const rec = { file: `screenshots/${file}`, fullPage, bytes: s.size, sha256: await sha(path), state: st, ...meta };
  shots.push(rec);
  log(`screenshot ${rec.file} :: ${fullPage ? 'fullPage' : `${meta.viewport[0]}x${meta.viewport[1]}`} ${s.size}B sha256 ${rec.sha256}`);
  return rec;
};
const enterTop = async () => { await page.locator('.page-actions .expand-view').click(); await page.waitForTimeout(500); };
const enterConsole = async () => { await page.locator('.replay-console .expand-button').click(); await page.waitForTimeout(500); };
const collapseHeader = async () => { await page.locator('.collapse-workbench').click(); await page.waitForTimeout(500); };
const esc = async () => { await page.keyboard.press('Escape'); await page.waitForTimeout(500); };

try {
  await page.goto(baseURL);
  await fontsReady();
  await setStateForCompare();
  const s0 = await state();
  await capture('01-default-1440x900-00m24s.png');
  check('1.baseline :: 00:24 paused, 2x, Detection off, Trails on, KPI 3/1/8/5, demo replay label', s0.playing === 'Replay paused' && s0.atMs === 24000 && s0.speed === '2' && s0.overlay === 'false' && s0.trails === 'true' && s0.metrics.entries === '03' && s0.metrics.exits === '01' && s0.metrics.occupancy === '08' && s0.metrics.tracks === '05' && s0.demoTyped && !s0.focused, s0);

  // ===== page-header expand: state preserved, canvas identity, demo label =====
  await enterTop();
  const sTop = await state();
  check('2.expandTop :: top text Expand enters full-page workbench with identical replay state', sTop.focused && eq(core(sTop), core(s0)), { core: core(sTop) });
  check('2.sameCanvas :: exactly one canvas and the same DOM node after entering', sTop.canvases === 1 && sTop.sameCanvas, { canvases: sTop.canvases, sameCanvas: sTop.sameCanvas });
  check('2.workbench :: camera source selector, event log, playback controls, overlays and Demo Replay are present',
    await page.locator('.source-option').count() === 3 && await page.locator('.event-rail').count() === 1 && await page.locator('.replay-console').count() === 1 && await page.locator('.advanced-row .toggle').count() === 2 && /DEMO REPLAY/.test(sTop.headerText), { sourceOptions: await page.locator('.source-option').count(), header: sTop.headerText });
  const expandedGeom = await page.evaluate(() => { const ap = document.querySelector('.camera-aperture').getBoundingClientRect(); const rail = document.querySelector('.event-rail').getBoundingClientRect(); return { video: { w: +ap.width.toFixed(1), h: +ap.height.toFixed(1), ratio: +(ap.width / ap.height).toFixed(4) }, rail: { w: +rail.width.toFixed(1), h: +rail.height.toFixed(1) } }; });
  check('2.enlarged :: expanded preview is materially larger than the 701px default and keeps 16:9', expandedGeom.video.w > 900 && expandedGeom.video.w <= 1400 && Math.abs(expandedGeom.video.ratio - 16 / 9) < 0.01, expandedGeom);

  // R1: source cards use the shared 15/14px metadata scale, keep the full store/ID and status,
  // and neither truncate nor overlap.
  const sourceAudit = await page.evaluate(() => {
    const opts = [...document.querySelectorAll('.source-option')];
    const rects = opts.map(o => o.getBoundingClientRect());
    const overlap = rects.some((a, i) => rects.some((b, j) => i < j && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1));
    const inside = opts.every(o => { const or = o.getBoundingClientRect(); return [...o.querySelectorAll('.source-meta, .source-state')].every(el => { const r = el.getBoundingClientRect(); return r.left >= or.left - 1 && r.right <= or.right + 1 && r.top >= or.top - 1 && r.bottom <= or.bottom + 1; }); });
    return {
      names: opts.map(o => ({ text: o.querySelector('.source-name')?.textContent?.trim(), fontSize: getComputedStyle(o.querySelector('.source-name')).fontSize })),
      metas: opts.map(o => { const el = o.querySelector('.source-meta'); const s = getComputedStyle(el); return { text: el.textContent.trim(), fontSize: s.fontSize, textOverflow: s.textOverflow, whiteSpace: s.whiteSpace, clipped: el.scrollWidth > el.clientWidth + 1 }; }),
      states: opts.map(o => ({ text: o.querySelector('.source-state')?.textContent?.trim(), fontSize: getComputedStyle(o.querySelector('.source-state')).fontSize, color: getComputedStyle(o.querySelector('.source-state')).color })),
      overlap, inside, count: opts.length,
      headerWidth: document.querySelector('.workbench-source').getBoundingClientRect().width,
    };
  });
  check('2.sourceType :: camera source keeps name 15px and store/ID + Available/Offline at 14px, untruncated',
    sourceAudit.count === 3 && sourceAudit.names.every(n => n.fontSize === '15px') && sourceAudit.metas.every(m => m.fontSize === '14px' && m.textOverflow !== 'ellipsis' && !m.clipped && /·/.test(m.text)) && sourceAudit.states.every(s => s.fontSize === '14px' && /Available|Offline/.test(s.text)),
    sourceAudit);
  check('2.sourceLayout :: the three source cards do not overlap and their metadata/status stay inside the cards', !sourceAudit.overlap && sourceAudit.inside, { overlap: sourceAudit.overlap, inside: sourceAudit.inside, headerWidth: sourceAudit.headerWidth });

  // R2: the dark workbench eyebrow must be legible on the dark event surface; the light page is untouched.
  const eyebrowAudit = async () => page.evaluate(() => {
    const parse = s => { const m = s.match(/rgba?\(([^)]+)\)/); const p = m[1].split(',').map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
    const comp = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
    const bgOf = el => { const st = []; let c = el; while (c) { const x = parse(getComputedStyle(c).backgroundColor); if (x.a > 0) { st.push(x); if (x.a >= 1) break; } c = c.parentElement; } let out = { r: 255, g: 255, b: 255, a: 1 }; for (let i = st.length - 1; i >= 0; i--) out = comp(st[i], out); return out; };
    const lum = c => { const v = [c.r, c.g, c.b].map(x => { x /= 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
    const eyebrow = document.querySelector('.workbench .rail-header .eyebrow');
    const fg = parse(getComputedStyle(eyebrow).color), bg = bgOf(eyebrow);
    const a = lum(fg), b = lum(bg), hi = Math.max(a, b), lo = Math.min(a, b);
    return { text: eyebrow.textContent.trim(), color: getComputedStyle(eyebrow).color, background: `rgb(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)})`, contrast: +((hi + 0.05) / (lo + 0.05)).toFixed(2), fontSize: getComputedStyle(eyebrow).fontSize };
  });
  const workbenchEyebrow = await eyebrowAudit();
  check('2.eyebrowContrast :: dark workbench OBSERVATION LOG eyebrow has >=4.5:1 contrast on its surface', workbenchEyebrow.contrast >= 4.5, workbenchEyebrow);

  await capture('02-expanded-1440x900-00m24s.png');
  await capture('02b-expanded-fullpage-1440.png', true);

  // ===== event rail collapse inside workbench =====
  await page.getByRole('button', { name: 'Hide event log' }).click(); await page.waitForTimeout(400);
  const sRailHidden = await state();
  const collapsedGeom = await page.evaluate(() => { const ap = document.querySelector('.camera-aperture').getBoundingClientRect(); return { video: { w: +ap.width.toFixed(1), h: +ap.height.toFixed(1) }, railVisible: !!document.querySelector('.event-rail') }; });
  check('3.eventsCollapse :: Hide events removes the rail, enlarges the player and keeps the replay state', !sRailHidden.railVisible && collapsedGeom.video.w > expandedGeom.video.w && eq(core(sRailHidden), core(s0)), { collapsedGeom, core: core(sRailHidden) });
  await capture('03-expanded-events-collapsed-1440x900-00m24s.png');
  await page.getByRole('button', { name: 'Show event log' }).click(); await page.waitForTimeout(400);

  // ===== expanded interactions =====
  await page.locator('.event-item').first().click(); await page.waitForTimeout(250);
  const detailOpen = await page.evaluate(() => ({ dialog: !!document.querySelector('dialog[open]'), focused: document.querySelector('.app').classList.contains('is-focused') }));
  await esc();
  const detailClosed = await page.evaluate(() => ({ dialog: !!document.querySelector('dialog[open]'), focused: document.querySelector('.app').classList.contains('is-focused'), active: document.activeElement?.classList.contains('event-item') }));
  check('4.eventDetail :: Esc closes only the event details; the workbench stays open and focus returns to the row', detailOpen.dialog && detailOpen.focused && !detailClosed.dialog && detailClosed.focused && detailClosed.active, { detailOpen, detailClosed });

  await page.getByRole('button', { name: 'Select CAM-DXB-02 East entrance' }).click(); await page.waitForTimeout(300);
  const east = await state();
  await seek(24000); await page.waitForTimeout(150);
  await page.getByRole('button', { name: 'Select CAM-DXB-01 Main entrance' }).click(); await page.waitForTimeout(250);
  await setStateForCompare();
  const backMain = await state();
  check('4.cameraSwitch :: camera switching inside the workbench keeps the original reset behaviour, then the 00:24 main snapshot returns', east.camera === 'East entrance' && east.atMs === 0 && east.playing === 'Replay paused' && eq(core(backMain), core(s0)), { east: core(east), back: core(backMain) });

  await page.getByRole('button', { name: 'Exits', exact: true }).click(); await page.waitForTimeout(150);
  const exitFilterCount = await page.locator('.event-item').count();
  await page.getByRole('button', { name: 'All events', exact: true }).click(); await page.waitForTimeout(150);
  const allFilterCount = await page.locator('.event-item').count();
  check('4.filter :: event filters still work inside the workbench', exitFilterCount === 1 && allFilterCount === 4, { exitFilterCount, allFilterCount });

  // keyboard / native inputs not hijacked
  const playStateBeforeSpace = (await state()).playing;
  await page.getByRole('combobox', { name: 'Playback speed' }).focus();
  await page.keyboard.press('ArrowUp'); await page.waitForTimeout(150);
  const speedAfterKey = await page.getByRole('combobox', { name: 'Playback speed' }).inputValue();
  await page.getByRole('combobox', { name: 'Playback speed' }).selectOption('2'); await page.waitForTimeout(120);
  await page.getByRole('combobox', { name: 'Playback speed' }).focus();
  await page.keyboard.press('Space'); await page.waitForTimeout(150);
  const afterSelectSpace = await state();
  await page.locator('input[aria-label="Replay position"]').focus();
  const rangeBefore = await page.locator('input[aria-label="Replay position"]').inputValue();
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(150);
  const rangeAfter = await page.locator('input[aria-label="Replay position"]').inputValue();
  await page.keyboard.press('Space'); await page.waitForTimeout(150);
  const afterRangeSpace = await state();
  await seek(24000); await page.waitForTimeout(120);
  check('4.inputs :: Space inside native select/range does not toggle playback; arrows still adjust values',
    afterSelectSpace.playing === playStateBeforeSpace && speedAfterKey === '1' && Number(rangeAfter) !== Number(rangeBefore) && afterRangeSpace.playing === 'Replay paused',
    { playStateBeforeSpace, afterSelectSpacePlay: afterSelectSpace.playing, speedAfterKey, rangeBefore, rangeAfter, afterRangeSpacePlay: afterRangeSpace.playing });

  // seek + speed + overlays in workbench
  await seek(30000);
  const seeked = (await state()).atMs;
  await setStateForCompare();
  const overlays = await page.evaluate(() => [...document.querySelectorAll('.advanced-row .toggle')].map(b => ({ text: b.textContent.trim(), pressed: b.getAttribute('aria-pressed') })));
  check('4.controls :: seek, speed and overlay controls remain available in the workbench', seeked === 30000 && eq(core(await state()), core(s0)) && overlays.length === 2, { seeked, overlays });

  // ===== collapse via header: state + focus + scroll =====
  await page.evaluate(() => window.scrollTo(0, 0));
  await collapseHeader();
  const sCollapsed = await state();
  check('5.collapse :: header Collapse restores the default page with identical replay state', !sCollapsed.focused && eq(core(sCollapsed), core(s0)), { core: core(sCollapsed) });
  check('5.collapseFocus :: Collapse restores focus to the page-header Expand trigger and the original scroll',
    sCollapsed.active?.cls.includes('expand-view') && sCollapsed.scrollY === 0, { active: sCollapsed.active, scrollY: sCollapsed.scrollY });
  await capture('04-collapsed-back-1440x900-00m24s.png');

  // ===== Esc from page-header entry =====
  await enterTop();
  await esc();
  const sEscTop = await state();
  check('6.escTop :: Esc from a page-header expand restores focus and scroll without changing state', !sEscTop.focused && eq(core(sEscTop), core(s0)) && sEscTop.active?.cls.includes('expand-view') && sEscTop.scrollY === 0, { active: sEscTop.active, scrollY: sEscTop.scrollY, core: core(sEscTop) });

  // ===== console entry with page scrolled: Collapse and Esc exits =====
  await page.evaluate(() => window.scrollTo(0, 320)); await page.waitForTimeout(150);
  const scrollEntry = await page.evaluate(() => window.scrollY);
  await enterConsole();
  const consoleExpanded = await state();
  await collapseHeader();
  const afterConsoleCollapse = await state();
  check('7.consoleEntry :: expanding from the preview control bar works and Collapse returns focus to that control + original scroll',
    consoleExpanded.focused && eq(core(consoleExpanded), core(s0)) && !afterConsoleCollapse.focused && afterConsoleCollapse.active?.cls.includes('expand-button') && afterConsoleCollapse.scrollY === scrollEntry,
    { scrollEntry, expanded: core(consoleExpanded), active: afterConsoleCollapse.active, scrollY: afterConsoleCollapse.scrollY });

  await page.evaluate(() => window.scrollTo(0, 320)); await page.waitForTimeout(150);
  const scrollEntry2 = await page.evaluate(() => window.scrollY);
  await enterConsole();
  await esc();
  const sEscConsole = await state();
  check('7.consoleEsc :: Esc from a control-bar expand restores focus to that control and the original scroll',
    !sEscConsole.focused && eq(core(sEscConsole), core(s0)) && sEscConsole.active?.cls.includes('expand-button') && sEscConsole.scrollY === scrollEntry2,
    { scrollEntry2, active: sEscConsole.active, scrollY: sEscConsole.scrollY });

  // ===== R3: F shortcut from a non-focusable target -> fallback to the main Expand entry =====
  const blurFocus = async () => { await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); }); await page.waitForTimeout(120); };
  await page.evaluate(() => window.scrollTo(0, 220)); await page.waitForTimeout(120);
  await blurFocus();
  const fBody = await page.evaluate(() => ({ tag: document.activeElement?.tagName, isBody: document.activeElement === document.body, scrollY: window.scrollY }));
  await page.keyboard.press('f'); await page.waitForTimeout(500);
  const fEntered = await state();
  await esc();
  const fEsc = await state();
  check('7b.fEntryEsc :: F from a body target opens the workbench; Esc falls back to the main Expand focus and restores scrollY',
    fBody.isBody && fEntered.focused && !fEsc.focused && eq(core(fEsc), core(s0)) && fEsc.active?.cls.includes('expand-view') && fEsc.scrollY === fBody.scrollY,
    { fBody, entered: fEntered.focused, active: fEsc.active, scrollY: fEsc.scrollY });

  await page.evaluate(() => window.scrollTo(0, 180)); await page.waitForTimeout(120);
  await blurFocus();
  const fBody2 = await page.evaluate(() => ({ tag: document.activeElement?.tagName, isBody: document.activeElement === document.body, scrollY: window.scrollY }));
  await page.keyboard.press('f'); await page.waitForTimeout(500);
  const fEntered2 = await state();
  await collapseHeader();
  const fCollapse = await state();
  check('7c.fEntryCollapse :: F from a body target opens the workbench; Collapse also falls back to the main Expand focus and restores scrollY',
    fBody2.isBody && fEntered2.focused && !fCollapse.focused && eq(core(fCollapse), core(s0)) && fCollapse.active?.cls.includes('expand-view') && fCollapse.scrollY === fBody2.scrollY,
    { fBody2, entered: fEntered2.focused, active: fCollapse.active, scrollY: fCollapse.scrollY });

  // ===== playback continuity across expand/collapse =====
  await page.evaluate(() => window.scrollTo(0, 0));
  await seek(24000);
  await page.getByRole('button', { name: 'Play replay' }).click();
  await page.waitForTimeout(400);
  const p0 = await state();
  await page.evaluate(() => { window.__qaCanvas = document.querySelector('.scene-render canvas'); });
  await enterTop();
  await page.waitForTimeout(500);
  const p1 = await state();
  await esc();
  await page.waitForTimeout(400);
  const p2 = await state();
  await page.getByRole('button', { name: 'Pause replay' }).click().catch(() => {});
  check('8.playing :: expand/collapse while playing only advances the clock and keeps playing (no reset/extra pause)',
    p0.playing === 'Replay playing' && p1.playing === 'Replay playing' && p2.playing === 'Replay playing' && p0.atMs < p1.atMs && p1.atMs < p2.atMs && p1.canvases === 1 && p1.sameCanvas && p2.sameCanvas,
    { p0: { atMs: p0.atMs, playing: p0.playing }, p1: { atMs: p1.atMs, playing: p1.playing }, p2: { atMs: p2.atMs, playing: p2.playing } });

  // ===== offline camera + empty log inside the workbench =====
  await seek(24000); await setStateForCompare();
  await enterTop();
  await page.getByRole('button', { name: 'Select CAM-MOE-01 Main entrance' }).click(); await page.waitForTimeout(350);
  const offline = await page.evaluate(() => {
    const stateBtn = document.querySelector('.camera-identity .status');
    const empty = document.querySelector('.empty-events');
    const src = [...document.querySelectorAll('.source-option')].find(b => b.getAttribute('aria-label') === 'Select CAM-MOE-01 Main entrance');
    return {
      toolbarStatus: stateBtn?.textContent?.trim(),
      playDisabled: document.querySelector('.play-button').disabled,
      emptyText: empty?.textContent.replace(/\s+/g, ' ').trim(),
      emptyFont: empty ? getComputedStyle(empty.querySelector('p')).fontSize : null,
      sourcePressed: src?.getAttribute('aria-pressed'),
      sourceText: src?.textContent.replace(/\s+/g, ' ').trim(),
      sourceOfflineColor: src ? getComputedStyle(src.querySelector('.source-state')).color : null,
    };
  });
  await capture('05-expanded-offline-camera-1440x900.png');
  check('9.offline :: offline camera in the workbench shows Offline + readable empty log and disables playback', offline.toolbarStatus === 'Offline' && offline.playDisabled && /No camera signal/i.test(offline.emptyText ?? '') && offline.emptyFont === '14px' && offline.sourcePressed === 'true' && /Offline/.test(offline.sourceText), offline);

  // restore online camera + default state
  await page.getByRole('button', { name: 'Select CAM-DXB-01 Main entrance' }).click(); await page.waitForTimeout(250);
  await seek(24000); await setStateForCompare();
  await esc();
  await page.waitForTimeout(200);

  // ===== default page regressions =====
  const def = await page.evaluate(() => {
    const rect = s => { const e = document.querySelector(s); const b = e.getBoundingClientRect(); return { w: +b.width.toFixed(2), h: +b.height.toFixed(2), top: +b.top.toFixed(2) }; };
    const q = s => document.querySelector(s);
    return {
      kpiBeforeWorkspace: q('.metrics-strip').getBoundingClientRect().top < q('.workspace').getBoundingClientRect().top,
      video: rect('.camera-aperture'), workspace: rect('.workspace'), rail: rect('.event-rail'),
      kpiColumns: getComputedStyle(q('.metrics-strip')).gridTemplateColumns.split(' ').length,
      scrollWidth: document.documentElement.scrollWidth,
      controls: { play: rect('.play-button'), speed: rect('.speed-select select'), scenario: rect('.scenario-select select'), timeline: rect('.timeline input'), step: rect('.dark-icon'), expand: rect('.expand-button') },
    };
  });
  check('10.defaultLayout :: default page layout, 720px preview cap, KPI ordering, real 40px controls do not regress',
    def.kpiBeforeWorkspace && def.kpiColumns === 4 && def.video.w >= 690 && def.video.w <= 720 && Math.abs(def.video.w / def.video.h - 16 / 9) < 0.01 && def.controls.play.h >= 44 && def.controls.speed.h >= 40 && def.controls.scenario.h >= 40 && def.controls.timeline.h >= 40 && def.controls.step.h >= 40 && def.controls.expand.h >= 40 && def.scrollWidth === 1440, def);

  // ===== KPI default + expanded dark contrast/alignment =====
  const kpiAudit = async () => page.evaluate(() => {
    const parse = s => { const m = s.match(/rgba?\(([^)]+)\)/); const p = m[1].split(',').map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
    const comp = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
    const bg = el => { const st = []; let c = el; while (c) { const x = parse(getComputedStyle(c).backgroundColor); if (x.a > 0) { st.push(x); if (x.a >= 1) break; } c = c.parentElement; } let out = { r: 255, g: 255, b: 255, a: 1 }; for (let i = st.length - 1; i >= 0; i--) out = comp(st[i], out); return out; };
    const lum = c => { const v = [c.r, c.g, c.b].map(x => { x /= 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
    const ratio = (a, b) => { const x = lum(a), y = lum(b), hi = Math.max(x, y), lo = Math.min(x, y); return +((hi + 0.05) / (lo + 0.05)).toFixed(2); };
    const metrics = [...document.querySelectorAll('.metric')].map(m => { const v = m.querySelector('.metric-value'), l = m.querySelector('.metric-label'), n = m.querySelector('.metric-note'), d = m.querySelector('.info-dot'); const vb = bg(v), lb = bg(l), nb = bg(n); return { value: ratio(parse(getComputedStyle(v).color), vb), label: ratio(parse(getComputedStyle(l).color), lb), note: ratio(parse(getComputedStyle(n).color), nb), top: +v.getBoundingClientRect().top.toFixed(3), size: getComputedStyle(v).fontSize, dot: d ? ratio(parse(getComputedStyle(d).color), bg(d)) : null }; });
    return { metrics, delta: +(Math.max(...metrics.map(m => m.top)) - Math.min(...metrics.map(m => m.top))).toFixed(3) };
  });
  const kpiDefault = await kpiAudit();
  await enterTop();
  const kpiExpanded = await kpiAudit();
  await esc();
  check('10.kpi :: KPI light/dark contrast and four-column alignment are preserved',
    kpiDefault.metrics.every(m => m.value >= 4.5 && m.label >= 4.5 && m.note >= 4.5) && kpiDefault.delta <= 1 && kpiExpanded.metrics.every(m => m.value >= 4.5 && m.label >= 4.5 && m.note >= 4.5) && kpiExpanded.delta <= 1,
    { light: kpiDefault, dark: kpiExpanded });

  // 1600 default cap sanity
  await page.setViewportSize({ width: 1600, height: 900 }); await page.waitForTimeout(300); await seek(24000);
  const wide = await page.evaluate(() => { const b = document.querySelector('.camera-aperture').getBoundingClientRect(); return { w: +b.width.toFixed(1), scrollWidth: document.documentElement.scrollWidth }; });
  await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(250);
  check('10.widthCap :: default preview stays <=720px at 1600 with no horizontal overflow', wide.w <= 720 && wide.scrollWidth === 1600, wide);

  // 1280 desktop workbench screenshot + source-card layout after the 14px metadata change.
  await page.setViewportSize({ width: 1280, height: 800 }); await page.waitForTimeout(300);
  await seek(24000); await setStateForCompare();
  await enterTop();
  const narrow = await page.evaluate(() => {
    const opts = [...document.querySelectorAll('.source-option')];
    const rects = opts.map(o => o.getBoundingClientRect());
    const overlap = rects.some((a, i) => rects.some((b, j) => i < j && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1));
    const overflow = document.documentElement.scrollWidth > innerWidth;
    const header = document.querySelector('.workbench-header').getBoundingClientRect();
    return {
      overlap, overflow, headerHeight: +header.height.toFixed(1),
      sourceMetas: opts.map(o => getComputedStyle(o.querySelector('.source-meta')).fontSize),
      sourceStates: opts.map(o => ({ text: o.querySelector('.source-state').textContent.trim(), fontSize: getComputedStyle(o.querySelector('.source-state')).fontSize })),
      cardsInsideHeader: opts.every(o => { const r = o.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }),
      video: (() => { const b = document.querySelector('.camera-aperture').getBoundingClientRect(); return { w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; })(),
    };
  });
  await capture('07-expanded-1280x800-00m24s.png');
  check('10.narrow1280 :: 1280 workbench keeps 14px source metadata, no overlap/overflow and the video/log remain usable',
    !narrow.overlap && !narrow.overflow && narrow.sourceMetas.every(s => s === '14px') && narrow.sourceStates.every(s => s.fontSize === '14px') && narrow.cardsInsideHeader && narrow.video.w > 700, narrow);
  await esc();
  await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(300);

  // 1440 default page still has the approved light eyebrow colour (R2 must stay scoped to the workbench).
  const defaultEyebrow = await page.evaluate(() => { const e = document.querySelector('.page-heading .eyebrow'); return e ? { color: getComputedStyle(e).color, text: e.textContent.trim() } : null; });
  check('10.defaultEyebrow :: default-page eyebrow colour is unchanged by the dark workbench override', !defaultEyebrow || defaultEyebrow.color === 'rgb(98, 102, 93)', defaultEyebrow);

  // ===== canvas identity across the whole run =====
  // The offline camera legitimately has no scene canvas (existing CameraScene behaviour: it returns the
  // offline empty state and disposes the renderer). Selection of cameras is not a "mode switch"; the check
  // below re-baselines after the last camera change and then performs two full mode cycles.
  await page.evaluate(() => { window.__qaCanvas = document.querySelector('.scene-render canvas'); });
  await enterTop();
  const cyc1 = await state();
  await collapseHeader();
  await page.evaluate(() => window.scrollTo(0, 0));
  await enterTop();
  await esc();
  const final = await state();
  check('11.canvas :: one canvas and the same DOM node across repeated expand/collapse cycles (no key/conditional remount)',
    final.canvases === 1 && final.sameCanvas && cyc1.sameCanvas && cyc1.canvases === 1,
    { cycle1: { canvases: cyc1.canvases, sameCanvas: cyc1.sameCanvas }, final: { canvases: final.canvases, sameCanvas: final.sameCanvas } });
  check('11.errors :: no page errors, console errors or failed requests', pageErrors.length === 0 && consoleErrors.length === 0 && failedRequests.length === 0, { pageErrors, consoleErrors, failedRequests });

  const endHashes = {};
  for (const f of sourceFiles) endHashes[f] = await sha(f);
  check('0.freeze :: source hashes unchanged between QA start and end', sourceFiles.every(f => endHashes[f] === sourceHashes[f].sha256), endHashes);

  const result = {
    generatedAt: new Date().toISOString(), baseURL, browser: await browser.version(), playwright: '1.58.2',
    viewport: { width: 1440, height: 900, deviceScaleFactor: 1 }, zoom: '100%',
    dist: { js: distJs, css: distCss, indexHtmlSha256: await sha('dist/index.html') },
    sourceHashes, screenshots: shots, checks,
    samples: { s0, sTop, sCollapsed, sEscTop, sEscConsole, playing: { p0, p1, p2 }, offline, sourceAudit, workbenchEyebrow, narrow1280: narrow },
    pageErrors, consoleErrors, failedRequests,
    notes: [
      'Screenshots 01-05 are 1440x900 / DPR1 / 100% viewport captures at 00:24 paused (2x, Detection off, Trails on) for state comparison; 02b is a full-page reference; 05 shows the workbench with the offline camera selected; 07 is the 1280x800 desktop workbench capture.',
      'Canvas identity is asserted with the same DOM node captured before the first mode change, plus canvas count. Camera switch/offline behaviour follows the existing CameraScene branch.',
      'Focus/scroll restore is asserted for page-header, control-bar and F-shortcut entries with both Collapse and Esc; the F path must fall back to the main Expand entry.',
      'R1 source metadata is asserted via computed 14px sizes with no ellipsis/clipping/overlap; R2 eyebrow contrast is computed from the real foreground and composed background.',
    ],
  };
  await writeFile(join(reportDir, 'workspace-state-qa-results.json'), JSON.stringify(result, null, 2));
  await writeFile(join(reportDir, 'workspace-state-qa.log'), logLines.join('\n') + '\n');
  log('');
  log(`wrote ${join(reportDir, 'workspace-state-qa-results.json')}`);
  log(`checks: ${checks.filter(c => c.ok).length} PASS / ${checks.filter(c => !c.ok).length} FAIL`);
} finally {
  await browser.close();
}
