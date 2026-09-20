/**
 * Verification suite for the DroidWork analytics layer.
 * Loads the real pages in headless Chromium and asserts the funnel wiring works.
 */
import { chromium } from 'playwright';
import { startServer } from './seo/serve.mjs';

const server = await startServer(8099);
const BASE = server.url;
const results = [];
function check(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? '  PASS' : '  FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

const browser = await chromium.launch();

async function blockChartCDN(pageOrCtx) {
  // Simulate the corporate-firewall scenario: Chart.js's CDN is unreachable.
  // This is the exact failure the try/catch wrapper in calc() was added to survive.
  await pageOrCtx.route(/(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net).*chart(\.js|@)/i,
    r => r.abort());
}
const ctx = await browser.newContext();

// ─── TEST 1: Calculator with prefill params ─────────────────────────────────
console.log('\n[1] Calculator + prefill + funnel');
const page = await ctx.newPage();
await blockChartCDN(page);
const logs = [], errors = [];
page.on('console', m => logs.push(m.text()));
page.on('pageerror', e => errors.push(String(e)));

const clarityRequests = [];
page.on('request', r => { if (r.url().includes('clarity.ms')) clarityRequests.push(r.url()); });

await page.goto(`${BASE}/calculator/?role=legal&level=director&utm_source=seo_test&dwdebug=1`, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

check('page loads with no JS errors', errors.length === 0, errors.slice(0, 2).join(' | '));
check('window.dw API present', await page.evaluate(() => !!(window.dw && window.dw.track && window.dw.tag && window.dw.funnel)));

const prefill = await page.evaluate(() => ({
  fn: document.getElementById('p_function')?.value,
  lv: document.getElementById('p_level')?.value,
}));
check('?role=legal OVERRIDES page default \'cs\'', prefill.fn === 'legal', `got "${prefill.fn}"`);
check('?level=director applied to level select', prefill.lv === 'director', `got "${prefill.lv}"`);

const masked = await page.evaluate(() => ['modal-name', 'modal-email', 'modal-company']
  .map(id => document.getElementById(id)?.getAttribute('data-clarity-mask')));
check('PII fields masked from session replay', masked.every(m => m === 'true'), `got ${JSON.stringify(masked)}`);

check('funnel: landed fired', logs.some(l => l.includes('01_landed')));
check('funnel: prefill detected', logs.some(l => l.includes('arrived_prefilled')));
check('funnel: calculation fired', logs.some(l => l.includes('02_ran_calculation')));
check('utm_source captured as tag', logs.some(l => l.includes('utm_source') && l.includes('seo_test')));
check('role tagged for segmentation', logs.some(l => l.includes('role_function')));
check('outcome bucket tagged', logs.some(l => l.includes('outcome')));

// Modal step
await page.evaluate(() => window.openEmailModal());
await page.waitForTimeout(250);
check('funnel: PDF modal open fired', logs.some(l => l.includes('04_opened_pdf_modal')));

// Clarity is now configured — it must actually load.
check('Clarity script loaded (ID configured)', clarityRequests.length > 0,
  clarityRequests.length ? clarityRequests[0] : 'no clarity.ms requests fired');

// Calculator still actually computes
const computed = await page.evaluate(() => {
  const s = window._calcState || {};
  return { emp: s.empTrueCostN, ai: s.cloudAIAnnual };
});
check('calculator math still runs after wrapping', typeof computed.emp === 'number' && computed.emp > 0,
  `empTrueCost=${computed.emp}`);

// ─── RESILIENCE: this sandbox blocks cdnjs, so Chart.js genuinely fails to
// load here — the exact corporate-firewall scenario. Assert we degrade well.
const chartBlocked = await page.evaluate(() => typeof window.Chart === 'undefined');
check('[resilience] Chart.js is genuinely unavailable in this run', chartBlocked,
  chartBlocked ? 'simulating a blocked CDN' : 'Chart.js loaded — resilience path not exercised');
if (chartBlocked) {
  check('[resilience] calc() still produced results without Chart.js',
    typeof computed.emp === 'number' && computed.emp > 0);
  check('[resilience] charts_unavailable event fired for Clarity',
    logs.some(l => l.includes('charts_unavailable')));
  const modalVals = await page.evaluate(() =>
    ['mp_emp', 'mp_ai', 'mp_save', 'mp_npv'].map(id => document.getElementById(id)?.textContent));
  check('[resilience] PDF modal shows real numbers, not "$—"',
    modalVals.every(v => v && v !== '$—'), JSON.stringify(modalVals));
}

// ─── TEST 2: Invalid prefill must be ignored ────────────────────────────────
// Fresh context: Chromium restores form state across same-path navigations,
// which would otherwise leak Test 1's selections into this assertion.
console.log('\n[2] Invalid prefill is rejected safely');
const ctx2 = await browser.newContext();
const p2 = await ctx2.newPage();
const err2 = [];
p2.on('pageerror', e => err2.push(String(e)));
await p2.goto(`${BASE}/calculator/?role=NOT_A_ROLE&level=9999`, { waitUntil: 'networkidle' });
await p2.waitForTimeout(400);
const fallback = await p2.evaluate(() => document.getElementById('p_function')?.value);
// Compare against a bare load rather than hardcoding: the page's own init sets
// its default role, and the assertion is "the bogus param changed nothing".
const pBare = await ctx2.newPage();
await pBare.goto(`${BASE}/calculator/`, { waitUntil: 'networkidle' });
await pBare.waitForTimeout(400);
const bareDefault = await pBare.evaluate(() => document.getElementById('p_function')?.value);
check('bogus role ignored, page default preserved',
  err2.length === 0 && fallback === bareDefault,
  `bogus=${fallback}, bare=${bareDefault}, errors=${err2.length}`);
await ctx2.close();

// ─── TEST 3: Other two pages ────────────────────────────────────────────────
for (const [label, url] of [['landing', '/'], ['methodology', '/calculator/methodology/']]) {
  console.log(`\n[3] ${label} page`);
  const p = await ctx.newPage();
  const e = [];
  p.on('pageerror', x => e.push(String(x)));
  await p.goto(BASE + url, { waitUntil: 'networkidle' });
  await p.waitForTimeout(400);
  check(`${label}: no JS errors`, e.length === 0, e.slice(0, 1).join(''));
  check(`${label}: analytics layer loaded`, await p.evaluate(() => !!window.dw));
  await p.close();
}

await browser.close();
await server.close();

const failed = results.filter(r => !r.pass);
console.log(`\n${'='.repeat(58)}`);
console.log(`RESULT: ${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  console.log('FAILURES:');
  failed.forEach(f => console.log(`  - ${f.name} ${f.detail}`));
  process.exit(1);
}
console.log('All checks passed.');
