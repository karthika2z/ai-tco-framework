/**
 * Full-site UX audit runner. Not a test — a data collector.
 * Visits every page (desktop + mobile), grabs screenshots, records JS
 * errors, failed requests, layout metrics, meta/JSON-LD signals, and
 * exercises the lead form to see the real submit path. Writes a JSON
 * summary + per-page screenshots to /tmp/dwaudit/.
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE = 'https://droidwork-326583597060.us-central1.run.app';

const PAGES = [
  { path: '/',                                                                  name: 'landing' },
  { path: '/calculator',                                                        name: 'calculator' },
  { path: '/calculator/methodology',                                            name: 'methodology' },
  { path: '/data/',                                                             name: 'data' },
  { path: '/advisory/',                                                         name: 'advisory' },
  { path: '/frameworks/',                                                       name: 'frameworks-hub' },
  { path: '/frameworks/the-agentic-loop-multiplier/',                           name: 'framework-alm' },
  { path: '/frameworks/the-concurrency-cliff/',                                 name: 'framework-cc' },
  { path: '/frameworks/constrain-escalate-contain/',                            name: 'framework-cec' },
  { path: '/insights/',                                                         name: 'insights-hub' },
  { path: '/insights/human-in-the-loop-will-not-protect-your-ai-agents/',       name: 'insight-hitl' },
  { path: '/insights/the-forward-deployed-engineer-quadrant/',                  name: 'insight-fde' },
  { path: '/roles/',                                                            name: 'roles-hub' },
  { path: '/roles/hr-generalist/',                                              name: 'role-hr' },
  { path: '/roles/software-engineer/',                                          name: 'role-swe' },
];

const browser = await chromium.launch();
const report = { base: BASE, pages: [], leadflow: null, generated: '2026-09-21' };

async function measure(page) {
  return page.evaluate(() => {
    const h1s = document.querySelectorAll('h1');
    const canonical = document.querySelector('link[rel=canonical]')?.href || '';
    const desc = document.querySelector('meta[name=description]')?.content || '';
    const title = document.title;
    const jsonld = [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => { try { return JSON.parse(s.textContent); } catch { return null; } }).filter(Boolean);
    const words = document.body.innerText.trim().split(/\s+/).length;
    const links = [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href'));
    const ctas = [...document.querySelectorAll('a.btn, button.btn, [data-dw-lead], .cta a, a.nav-cta')]
      .map(a => ({ text: (a.innerText || '').trim().slice(0, 80), href: a.getAttribute('href'), intent: a.getAttribute('data-dw-lead') || '' }))
      .filter(c => c.text);
    const overflow = document.documentElement.scrollWidth > window.innerWidth + 2;
    const scrollHeight = document.documentElement.scrollHeight;
    const clarityLoaded = !!window.clarity;
    const dwLoaded = !!(window.dw && window.dw.track);
    const leadTriggers = [...document.querySelectorAll('[data-dw-lead]')].length;
    return { h1Count: h1s.length, h1Text: h1s[0]?.innerText.trim() || '', title, canonical, desc, jsonldCount: jsonld.length, jsonldTypes: [...new Set(jsonld.flatMap(j => JSON.stringify(j).match(/"@type":\s*"([^"]+)"/g) || []).map(s => s.replace(/.*"([^"]+)".*/,'$1')))], words, links, ctas, overflow, scrollHeight, clarityLoaded, dwLoaded, leadTriggers };
  });
}

async function visit(pathname, name, viewport, ctx) {
  const p = await ctx.newPage();
  const pageErrs = [];
  const failed = [];
  const consoleErrs = [];
  p.on('pageerror', e => pageErrs.push(String(e)));
  p.on('requestfailed', r => failed.push({ url: r.url(), err: r.failure()?.errorText }));
  p.on('console', m => { if (m.type() === 'error') consoleErrs.push(m.text().slice(0, 200)); });

  const t0 = Date.now();
  const resp = await p.goto(BASE + pathname, { waitUntil: 'networkidle', timeout: 30000 }).catch(e => ({ status: () => 0, err: e.message }));
  const t1 = Date.now();
  await p.waitForTimeout(500);
  const m = await measure(p);
  const shot = `/tmp/dwaudit/${name}-${viewport}.png`;
  await p.screenshot({ path: shot, fullPage: false });
  await p.close();
  return { path: pathname, viewport, status: resp.status ? resp.status() : 0, loadMs: t1 - t0, pageErrs, failed: failed.slice(0, 10), consoleErrs: consoleErrs.slice(0, 8), ...m, screenshot: shot };
}

// ─── DESKTOP SWEEP ───────────────────────────────────────────────────────────
const desk = await browser.newContext({ viewport: { width: 1440, height: 900 } });
for (const pg of PAGES) {
  const r = await visit(pg.path, pg.name, 'desktop', desk);
  report.pages.push(r);
  console.log(`  ${r.viewport.padEnd(7)} ${String(r.status).padEnd(3)} ${String(r.loadMs).padStart(5)}ms  ${pg.path}`);
}
await desk.close();

// ─── MOBILE SWEEP (Safari iPhone 14 Pro) ────────────────────────────────────
const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1', isMobile: true });
for (const pg of PAGES) {
  const r = await visit(pg.path, pg.name, 'mobile', mob);
  report.pages.push(r);
  console.log(`  ${r.viewport.padEnd(7)} ${String(r.status).padEnd(3)} ${String(r.loadMs).padStart(5)}ms  ${pg.path}`);
}
await mob.close();

// ─── AGENT-REFERRAL SIMULATION ──────────────────────────────────────────────
const agentCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, extraHTTPHeaders: { Referer: 'https://chat.openai.com/c/audit-run' } });
const ap = await agentCtx.newPage();
await ap.goto(BASE + '/frameworks/the-agentic-loop-multiplier/', { waitUntil: 'networkidle' });
report.agentDetection = {
  detected: await ap.evaluate(() => window.dwLead?.agent || ''),
  clarityLoaded: await ap.evaluate(() => !!window.clarity),
};
await ap.close();
await agentCtx.close();

// ─── LEAD-FORM EXERCISE (real submission would go through — we abort at the network level) ──
const lctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const lp = await lctx.newPage();
let posted = null;
await lp.route('https://api.droidwork.ai/leads', route => {
  posted = { body: route.request().postDataJSON() };
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, email_sent: true }) });
});
await lp.goto(BASE + '/advisory/', { waitUntil: 'networkidle' });
await lp.locator('[data-dw-lead="review_request"]').first().click();
await lp.waitForSelector('.dwl-back.open', { timeout: 3000 });
await lp.screenshot({ path: '/tmp/dwaudit/lead-modal-desktop.png' });
await lp.fill('#dwl-name', 'Audit Bot');
await lp.fill('#dwl-email', 'audit@example.com');
await lp.fill('#dwl-company', 'Audit Corp');
await lp.click('#dwl-submit');
await lp.waitForSelector('#dwl-ok', { state: 'visible', timeout: 5000 });
await lp.screenshot({ path: '/tmp/dwaudit/lead-modal-success.png' });
report.leadflow = { posted };
await lp.close();
await lctx.close();

// Mobile-modal look
const lm = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1', isMobile: true });
const lmp = await lm.newPage();
await lmp.route('https://api.droidwork.ai/leads', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' }));
await lmp.goto(BASE + '/advisory/', { waitUntil: 'networkidle' });
await lmp.locator('[data-dw-lead="review_request"]').first().click({ position: { x: 5, y: 5 } }).catch(() => {});
// Click again more forgivingly
await lmp.evaluate(() => document.querySelector('[data-dw-lead="review_request"]')?.click());
await lmp.waitForTimeout(400);
await lmp.screenshot({ path: '/tmp/dwaudit/lead-modal-mobile.png' });
await lmp.close();
await lm.close();

await browser.close();

writeFileSync('/tmp/dwaudit/report.json', JSON.stringify(report, null, 2));
console.log('\nWrote /tmp/dwaudit/report.json + screenshots.');
