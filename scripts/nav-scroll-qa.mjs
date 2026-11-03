/**
 * Navigation shell scroll-sync regression check.
 *
 * Guards the fixed Header + fixed Sidebar shell contract:
 *  - Header stays pinned to the top of the viewport while the page scrolls.
 *  - Sidebar starts exactly at the Header's bottom edge (no blank strip above it).
 *  - Page content starts below the Header, never underneath it or the Sidebar.
 *
 * Run against a dev/preview server: QA_URL=http://127.0.0.1:5173 node scripts/nav-scroll-qa.mjs
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const baseURL = process.env.QA_URL || 'http://127.0.0.1:5173';
const out = 'evidence/nav-scroll';
await mkdir(out, { recursive: true });

const failures = [];
const results = [];
const check = (name, condition, detail = '') => {
  if (condition) results.push(name);
  else failures.push({ name, detail });
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${condition || !detail ? '' : `\n      ${detail}`}`);
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', e => errors.push(e.message));

const rects = () => page.evaluate(() => {
  const read = selector => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height, position: cs.position, zIndex: cs.zIndex };
  };
  const at = (x, y) => {
    const el = document.elementFromPoint(x, y);
    return el ? { tag: el.tagName, className: typeof el.className === 'string' ? el.className : '', inHeader: !!el.closest('.global-header'), inSidebar: !!el.closest('.sidebar'), inMain: !!el.closest('.main-content') } : null;
  };
  return {
    scrollY,
    innerWidth,
    innerHeight,
    scrollHeight: document.documentElement.scrollHeight,
    scrollWidth: document.documentElement.scrollWidth,
    header: read('.global-header'),
    sidebar: read('.sidebar'),
    main: read('.main-content'),
    heading: read('.page-heading'),
    footer: read('.page-footer'),
    atHeaderBandLeft: at(10, 10),
    atHeaderBandMiddle: at(Math.floor(innerWidth / 2), 10),
    atJustBelowHeader: at(10, (document.querySelector('.global-header')?.getBoundingClientRect().height ?? 72) + 12),
    atContentStart: at((document.querySelector('.main-content')?.getBoundingClientRect().left ?? 0) + 20, 40),
  };
});

const capture = async (name, { fullPage = false } = {}) => {
  await page.evaluate(() => document.activeElement?.blur());
  await page.screenshot({ path: `${out}/${name}.png`, fullPage });
};

const scrollToBottom = async () => {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(200);
};
const scrollToTop = async () => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
};

const expectShell = async (label, headerHeight, navWidth) => {
  const top = await rects();
  check(`${label}: header is position:fixed`, top.header?.position === 'fixed', JSON.stringify(top.header));
  check(`${label}: header pinned to viewport top`, Math.abs(top.header.top) < 0.5 && top.header.left === 0 && Math.abs(top.header.width - top.innerWidth) < 0.5, JSON.stringify(top.header));
  check(`${label}: header height equals --header-height (${headerHeight}px)`, Math.abs(top.header.height - headerHeight) < 0.5, `measured ${top.header.height}`);
  check(`${label}: sidebar is position:fixed`, top.sidebar?.position === 'fixed', JSON.stringify(top.sidebar));
  check(`${label}: sidebar starts at header bottom`, Math.abs(top.sidebar.top - top.header.bottom) < 0.5, `sidebar.top=${top.sidebar.top} header.bottom=${top.header.bottom}`);
  check(`${label}: sidebar is flush to viewport left/bottom`, Math.abs(top.sidebar.left) < 0.5 && Math.abs(top.sidebar.bottom - top.innerHeight) < 0.5, JSON.stringify(top.sidebar));
  check(`${label}: header spans the strip above the sidebar`, top.atHeaderBandLeft?.inHeader === true && top.atHeaderBandMiddle?.inHeader === true, JSON.stringify({ left: top.atHeaderBandLeft, middle: top.atHeaderBandMiddle }));
  check(`${label}: sidebar fills the column below the header`, top.atJustBelowHeader?.inSidebar === true, JSON.stringify(top.atJustBelowHeader));
  check(`${label}: content starts right of sidebar and below header`, Math.abs(top.main.left - navWidth) < 0.5 && top.heading.top >= top.header.bottom, `main.left=${top.main.left} heading.top=${top.heading.top}`);
  check(`${label}: no horizontal overflow`, top.scrollWidth === top.innerWidth, `scrollWidth=${top.scrollWidth} innerWidth=${top.innerWidth}`);

  await scrollToBottom();
  const scrolled = await rects();
  check(`${label}: header remains pinned after scrolling`, Math.abs(scrolled.header.top) < 0.5 && Math.abs(scrolled.header.bottom - headerHeight) < 0.5, `scrollY=${scrolled.scrollY} header=${JSON.stringify(scrolled.header)}`);
  check(`${label}: no blank strip between header and sidebar after scrolling`, Math.abs(scrolled.sidebar.top - scrolled.header.bottom) < 0.5, `scrollY=${scrolled.scrollY} sidebar.top=${scrolled.sidebar.top} header.bottom=${scrolled.header.bottom}`);
  check(`${label}: sidebar stays flush left/bottom after scrolling`, scrolled.sidebar.left === 0 && Math.abs(scrolled.sidebar.bottom - scrolled.innerHeight) < 0.5, JSON.stringify(scrolled.sidebar));
  check(`${label}: header still covers top-left strip after scrolling`, scrolled.atHeaderBandLeft?.inHeader === true, JSON.stringify(scrolled.atHeaderBandLeft));
  check(`${label}: sidebar directly below header after scrolling`, scrolled.atJustBelowHeader?.inSidebar === true, JSON.stringify(scrolled.atJustBelowHeader));
  check(`${label}: scrolled content is not under the sidebar`, scrolled.atContentStart?.inSidebar !== true, JSON.stringify(scrolled.atContentStart));
  check(`${label}: scrolling actually happened`, scrolled.scrollY > 0, `scrollY=${scrolled.scrollY}`);
  return { top, scrolled };
};

try {
  await page.goto(`${baseURL}/live`);
  await page.getByRole('heading', { name: 'Live Vision.' }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);

  // Desktop reference viewport: 1440x900.
  await capture('after-1440x900-top');
  let state = await expectShell('1440x900', 72, 76);
  await capture('after-1440x900-scrolled');
  await writeFile(`${out}/layout-1440x900.json`, JSON.stringify({ top: state.top, scrolled: state.scrolled }, null, 2));

  // Expanded navigation.
  await scrollToTop();
  await page.getByRole('button', { name: 'Expand navigation', exact: true }).click();
  await page.waitForTimeout(250);
  await capture('after-1440x900-expanded-top');
  state = await expectShell('1440x900 expanded', 72, 224);
  await capture('after-1440x900-expanded-scrolled');
  await page.getByRole('button', { name: 'Hide navigation', exact: true }).click();
  await page.waitForTimeout(250);
  const hidden = await page.evaluate(() => ({ sidebar: !!document.querySelector('.sidebar'), header: getComputedStyle(document.querySelector('.global-header')).position }));
  check('1440x900 nav hidden: sidebar removed, header still fixed', hidden.sidebar === false && hidden.header === 'fixed', JSON.stringify(hidden));
  const hiddenRects = await rects();
  check('1440x900 nav hidden: content reclaims sidebar width', Math.abs(hiddenRects.main.left) < 0.5, `main.left=${hiddenRects.main.left}`);
  await capture('after-1440x900-nav-hidden-scrolled');
  await scrollToTop();
  await page.getByRole('button', { name: 'Show navigation', exact: true }).click();
  await page.waitForTimeout(200);

  // Responsive shell sizes: each breakpoint owns its header height / sidebar width.
  for (const { width, height, headerHeight, navWidth, label } of [
    { width: 1920, height: 1080, headerHeight: 72, navWidth: 76, label: '1920x1080' },
    { width: 1366, height: 768, headerHeight: 72, navWidth: 76, label: '1366x768-short' },
    { width: 1024, height: 768, headerHeight: 72, navWidth: 76, label: '1024x768-short' },
    { width: 900, height: 800, headerHeight: 64, navWidth: 60, label: '900x800' },
    { width: 768, height: 900, headerHeight: 64, navWidth: 60, label: '768x900' },
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(300);
    await scrollToTop();
    await capture(`after-${label}-top`);
    state = await expectShell(label, headerHeight, navWidth);
    await capture(`after-${label}-scrolled`);
  }

  // Mobile: sidebar is hidden, fixed header must still not overlap page content.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(350);
  await scrollToTop();
  const mobile = await rects();
  check('390x844: sidebar hidden on mobile', mobile.sidebar === null || mobile.sidebar.width === 0, JSON.stringify(mobile.sidebar));
  check('390x844: header fixed at top', mobile.header.position === 'fixed' && Math.abs(mobile.header.top) < 0.5 && Math.abs(mobile.header.height - 64) < 0.5, JSON.stringify(mobile.header));
  check('390x844: content clears fixed header', mobile.main.left === 0 && mobile.heading.top >= mobile.header.bottom, `main.left=${mobile.main.left} heading.top=${mobile.heading.top}`);
  await capture('after-390x844-top');
  await scrollToBottom();
  const mobileScrolled = await rects();
  check('390x844: header stays pinned while scrolling', Math.abs(mobileScrolled.header.top) < 0.5, JSON.stringify(mobileScrolled.header));
  await capture('after-390x844-scrolled');

  // Focus mode intentionally removes the shell; content must sit at the very top.
  await page.setViewportSize({ width: 1440, height: 900 });
  await scrollToTop();
  await page.getByRole('button', { name: 'Enter focus mode', exact: true }).click();
  await page.waitForTimeout(350);
  const focused = await page.evaluate(() => {
    const main = document.querySelector('.main-content').getBoundingClientRect();
    return { header: !!document.querySelector('.global-header'), sidebar: !!document.querySelector('.sidebar'), mainTop: main.top, mainTopStyle: getComputedStyle(document.querySelector('.main-content')).paddingTop };
  });
  check('focus mode: shell removed and content starts at viewport top', focused.header === false && focused.sidebar === false && Math.abs(focused.mainTop) < 0.5, JSON.stringify(focused));
  await capture('after-focus-mode');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  const exited = await rects();
  check('escape focus: fixed shell restored', Math.abs(exited.header.top) < 0.5 && Math.abs(exited.sidebar.top - exited.header.bottom) < 0.5, JSON.stringify({ header: exited.header, sidebar: exited.sidebar }));

  check('no runtime page errors', errors.length === 0, errors.join('; '));
} finally {
  await writeFile(`${out}/nav-scroll-results.json`, JSON.stringify({ baseURL, checks: results, failures, errors }, null, 2));
  console.log(`\n${results.length} checks passed, ${failures.length} failed. Evidence: ${out}`);
  await browser.close();
}

if (failures.length) process.exitCode = 1;
