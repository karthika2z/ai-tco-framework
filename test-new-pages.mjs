/**
 * Verification suite for the new sections:
 *   /data/, /advisory/, /frameworks/, /insights/the-forward-deployed-engineer-quadrant/
 *
 * Checks 200s, single H1, valid JSON-LD, no mobile overflow, and that every
 * internal link on every new page actually resolves.
 */
import { chromium } from 'playwright';
import { startServer } from './seo/serve.mjs';

const server = await startServer(8099);
const BASE = server.url;
const results = [];
function ck(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? '  PASS' : '  FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
const jsErrors = [];
page.on('pageerror', e => jsErrors.push(String(e)));

const PAGES = [
  { path: '/data/',                                                             titleHint: 'Dataset' },
  { path: '/advisory/',                                                         titleHint: 'Advisory' },
  { path: '/frameworks/',                                                       titleHint: 'Framework' },
  { path: '/frameworks/the-agentic-loop-multiplier/',                           titleHint: 'Agentic Loop' },
  { path: '/frameworks/the-concurrency-cliff/',                                 titleHint: 'Concurrency Cliff' },
  { path: '/frameworks/constrain-escalate-contain/',                            titleHint: 'Constrain' },
  { path: '/insights/the-forward-deployed-engineer-quadrant/',                  titleHint: 'Forward Deployed' },
];

console.log('\n[1] Core page checks (per section)');
for (const p of PAGES) {
  jsErrors.length = 0;
  const resp = await page.goto(BASE + p.path, { waitUntil: 'networkidle' });
  ck(`${p.path}: 200 OK`, resp.status() === 200, `status=${resp.status()}`);
  ck(`${p.path}: no JS errors`, jsErrors.length === 0, jsErrors[0] || '');

  const h1s = await page.locator('h1').count();
  ck(`${p.path}: exactly one <h1>`, h1s === 1, `count=${h1s}`);

  const title = await page.title();
  ck(`${p.path}: title contains "${p.titleHint}"`, title.includes(p.titleHint), title);

  const canonical = await page.locator('link[rel=canonical]').getAttribute('href');
  ck(`${p.path}: canonical link present`, !!canonical, canonical || 'missing');

  const desc = await page.locator('meta[name=description]').getAttribute('content');
  ck(`${p.path}: meta description ≥ 80 chars`, (desc || '').length >= 80, `len=${(desc || '').length}`);

  const ldBlocks = await page.evaluate(() =>
    [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => s.textContent));
  let ldOk = ldBlocks.length > 0;
  try { ldBlocks.forEach(b => JSON.parse(b)); } catch { ldOk = false; }
  ck(`${p.path}: JSON-LD parses`, ldOk, `blocks=${ldBlocks.length}`);

  ck(`${p.path}: analytics layer loaded`, await page.evaluate(() => !!window.dw));
}

console.log('\n[2] Schema.org type coverage');
async function getGraphTypes(path) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  return page.evaluate(() => {
    const types = new Set();
    document.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
      const j = JSON.parse(s.textContent);
      const walk = o => {
        if (!o || typeof o !== 'object') return;
        if (o['@type']) (Array.isArray(o['@type']) ? o['@type'] : [o['@type']]).forEach(t => types.add(t));
        for (const k in o) walk(o[k]);
      };
      walk(j);
    });
    return [...types];
  });
}
const dataTypes = await getGraphTypes('/data/');
ck('/data/: Dataset schema present', dataTypes.includes('Dataset'), dataTypes.join(','));
const advTypes = await getGraphTypes('/advisory/');
ck('/advisory/: Service + Offer + FAQPage', ['Service', 'Offer', 'FAQPage'].every(t => advTypes.includes(t)), advTypes.join(','));
const fwTypes = await getGraphTypes('/frameworks/the-agentic-loop-multiplier/');
ck('/frameworks/*: DefinedTerm + Article + FAQPage', ['DefinedTerm', 'Article', 'FAQPage'].every(t => fwTypes.includes(t)), fwTypes.join(','));

console.log('\n[3] Downloads on /data/');
const csvResp = await page.request.get(BASE + '/data/ai-tco-dataset.csv');
const csvText = await csvResp.text();
ck('/data/ai-tco-dataset.csv: 200', csvResp.status() === 200);
ck('/data/ai-tco-dataset.csv: 132 rows + header', csvText.trim().split('\n').length === 133, String(csvText.trim().split('\n').length));
const jsonResp = await page.request.get(BASE + '/data/ai-tco-dataset.json');
const jsonBody = await jsonResp.text();
ck('/data/ai-tco-dataset.json: 200', jsonResp.status() === 200);
let parsed = null;
try { parsed = JSON.parse(jsonBody); } catch {}
ck('/data/ai-tco-dataset.json: parses to 132 rows', Array.isArray(parsed) && parsed.length === 132, parsed ? String(parsed.length) : 'parse failed');

console.log('\n[4] llms.txt + insights feed');
const llms = await page.request.get(BASE + '/llms.txt');
ck('/llms.txt: 200', llms.status() === 200);
const llmsText = await llms.text();
ck('/llms.txt: mentions calculator, dataset, frameworks, insights',
  ['/calculator/', '/data/', '/frameworks/', '/insights/'].every(s => llmsText.includes(s)),
  '');

const feed = await page.request.get(BASE + '/insights/feed.xml');
ck('/insights/feed.xml: 200', feed.status() === 200);
const feedText = await feed.text();
ck('/insights/feed.xml: valid Atom with 2 entries',
  feedText.includes('<feed xmlns="http://www.w3.org/2005/Atom">') && (feedText.match(/<entry>/g) || []).length === 2,
  `entries=${(feedText.match(/<entry>/g) || []).length}`);

await page.goto(BASE + '/insights/', { waitUntil: 'networkidle' });
const feedLink = await page.locator('link[rel=alternate][type="application/atom+xml"]').getAttribute('href');
ck('/insights/: advertises feed via <link rel=alternate>', !!feedLink && feedLink.includes('feed.xml'), feedLink || '');

// Button color fix — .nav-links a.btn must NOT inherit the muted color
await page.goto(BASE + '/frameworks/the-agentic-loop-multiplier/', { waitUntil: 'networkidle' });
const btnColor = await page.locator('.nav-links a.btn').first().evaluate(el => getComputedStyle(el).color);
ck('nav-links a.btn: readable text (not muted teal)', btnColor === 'rgb(4, 36, 29)', btnColor);

console.log('\n[5] /data/ filter + sort JS');
await page.goto(BASE + '/data/', { waitUntil: 'networkidle' });
const before = await page.locator('#rows tr:not([style*="display: none"])').count();
await page.selectOption('#fn', 'hr');
const after = await page.locator('#rows tr:not([style*="display: none"])').count();
ck('/data/: filter by function narrows table', after < before && after > 0, `${before} → ${after}`);
await page.selectOption('#fn', '');
await page.selectOption('#sign', 'neg');
const negCount = await page.locator('#rows tr:not([style*="display: none"])').count();
ck('/data/: filter to negative-savings finds >0 rows', negCount > 0, String(negCount));

console.log('\n[6] Mobile overflow (390px)');
await page.setViewportSize({ width: 390, height: 844 });
for (const p of PAGES) {
  await page.goto(BASE + p.path, { waitUntil: 'networkidle' });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  ck(`${p.path}: no horizontal overflow at 390px`, !overflow);
}
await page.setViewportSize({ width: 1280, height: 900 });

console.log('\n[7] Internal-link resolution (every link on every new page)');
const OK_CODES = new Set([200, 301, 302, 304]);
const linkCache = new Map();
async function checkLink(url) {
  if (linkCache.has(url)) return linkCache.get(url);
  const r = await page.request.fetch(BASE + url, { failOnStatusCode: false }).catch(() => null);
  const code = r ? r.status() : 0;
  const ok = OK_CODES.has(code);
  linkCache.set(url, { ok, code });
  return { ok, code };
}
let brokenLinks = 0, totalLinks = 0;
for (const p of PAGES) {
  await page.goto(BASE + p.path, { waitUntil: 'networkidle' });
  const links = await page.$$eval('a[href]', as => as.map(a => a.getAttribute('href')));
  const internal = [...new Set(links)]
    .filter(h => h && !h.startsWith('http') && !h.startsWith('mailto:') && !h.startsWith('#') && !h.startsWith('tel:'))
    .map(h => h.split('#')[0])
    .filter(Boolean);
  for (const url of internal) {
    totalLinks++;
    const { ok, code } = await checkLink(url);
    if (!ok) { brokenLinks++; console.log(`    BROKEN ${p.path} -> ${url}  (${code})`); }
  }
}
ck(`all internal links resolve (${totalLinks} checked)`, brokenLinks === 0, `${brokenLinks} broken`);

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
