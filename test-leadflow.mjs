/**
 * End-to-end lead-flow verification.
 *
 * Runs the site through Playwright, intercepts the api.droidwork.ai/leads
 * request, and checks:
 *   - form triggers exist on /data/, /advisory/, /frameworks/, /insights/, /calculator/
 *   - clicking each trigger opens the modal with the right title
 *   - the modal validates (no email → error, valid → submit)
 *   - the POST body carries intent, source, and (when a referrer matches) agent
 *   - failure paths keep the form open and surface a message
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

// ─── Helper: intercept the worker so nothing hits prod ─────────────────────
async function armInterceptor(page, opts = {}) {
  const captured = { hits: [] };
  await page.route('https://api.droidwork.ai/leads', async route => {
    const body = route.request().postDataJSON();
    captured.hits.push(body);
    if (opts.fail) return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'boom' }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, email_sent: true }) });
  });
  return captured;
}

// ─── 1. Trigger presence + modal open ──────────────────────────────────────
console.log('\n[1] Lead triggers exist on all target pages');
const TARGETS = [
  { path: '/advisory/',                                                intents: ['kit_request', 'review_request'] },
  { path: '/data/',                                                    intents: ['dataset_onepager', 'review_request'] },
  { path: '/frameworks/',                                              intents: ['frameworks_pack', 'review_request'] },
  { path: '/frameworks/the-agentic-loop-multiplier/',                  intents: ['frameworks_pack', 'review_request'] },
  { path: '/insights/human-in-the-loop-will-not-protect-your-ai-agents/', intents: ['review_request'] },
  { path: '/calculator',                                               intents: ['review_request'] },
];
const page1 = await browser.newPage();
for (const t of TARGETS) {
  await page1.goto(BASE + t.path, { waitUntil: 'networkidle' });
  for (const intent of t.intents) {
    const count = await page1.locator(`[data-dw-lead="${intent}"]`).count();
    ck(`${t.path}: has [data-dw-lead="${intent}"]`, count >= 1, `count=${count}`);
  }
}
await page1.close();

// ─── 2. Modal opens on click, shows the right intent copy ──────────────────
console.log('\n[2] Clicking a trigger opens the modal with matching copy');
const page2 = await browser.newPage();
await page2.goto(BASE + '/advisory/', { waitUntil: 'networkidle' });
await page2.locator('[data-dw-lead="review_request"]').first().click();
await page2.waitForSelector('.dwl-back.open', { timeout: 3000 });
const title = await page2.locator('#dwl-title').textContent();
ck('modal opens with review_request title', /review|intake/i.test(title), title || '');
await page2.keyboard.press('Escape');
await page2.locator('[data-dw-lead="kit_request"]').first().click();
await page2.waitForSelector('.dwl-back.open', { timeout: 3000 });
const kitTitle = await page2.locator('#dwl-title').textContent();
ck('modal switches to kit_request title', /kit/i.test(kitTitle), kitTitle || '');
await page2.close();

// ─── 3. Validation before submit ───────────────────────────────────────────
console.log('\n[3] Client-side validation');
const page3 = await browser.newPage();
await armInterceptor(page3);
await page3.goto(BASE + '/advisory/', { waitUntil: 'networkidle' });
await page3.locator('[data-dw-lead="review_request"]').first().click();
await page3.waitForSelector('.dwl-back.open');
// Force-submit without filling
await page3.evaluate(() => document.getElementById('dwl-form').requestSubmit());
await page3.waitForTimeout(150);
const errText = await page3.locator('#dwl-error').textContent();
ck('empty submit surfaces validation error', /name|email|company/i.test(errText || ''), errText || '');
await page3.close();

// ─── 4. Successful submit posts intent + source ────────────────────────────
console.log('\n[4] Happy path — POST body contains intent + source');
const page4 = await browser.newPage();
const cap4 = await armInterceptor(page4);
await page4.goto(BASE + '/advisory/', { waitUntil: 'networkidle' });
await page4.locator('[data-dw-lead="kit_request"]').first().click();
await page4.waitForSelector('.dwl-back.open');
await page4.fill('#dwl-name', 'Test User');
await page4.fill('#dwl-email', 'test.user@example.com');
await page4.fill('#dwl-company', 'Example Corp');
await page4.fill('#dwl-context', 'Evaluating for a 30-person legal team');
await page4.click('#dwl-submit');
await page4.waitForSelector('#dwl-ok', { state: 'visible', timeout: 5000 });
ck('POST fired to /leads', cap4.hits.length === 1, `hits=${cap4.hits.length}`);
const body = cap4.hits[0] || {};
ck('body.email set', body.email === 'test.user@example.com', body.email || '');
ck('body.company set', body.company === 'Example Corp', body.company || '');
ck('body.name set', body.name === 'Test User', body.name || '');
ck('body.role packs intent', (body.role || '').includes('intent=kit_request'), body.role || '');
ck('body.role packs source', (body.role || '').includes('source=/advisory/'), body.role || '');
ck('body.role packs note', (body.role || '').includes('note=Evaluating'), body.role || '');
ck('confirmation panel shown', await page4.locator('#dwl-ok').isVisible());
await page4.close();

// ─── 5. Agent-referral detection ───────────────────────────────────────────
console.log('\n[5] Agent-referral detection');
const page5 = await browser.newPage();
const cap5 = await armInterceptor(page5);
await page5.setExtraHTTPHeaders({ Referer: 'https://chat.openai.com/c/some-session' });
await page5.goto(BASE + '/frameworks/the-agentic-loop-multiplier/', { waitUntil: 'networkidle' });
const agentDetected = await page5.evaluate(() => (window.dwLead && window.dwLead.agent) || '');
ck('referrer from ChatGPT detected as "chatgpt"', agentDetected === 'chatgpt', agentDetected || 'none');
await page5.locator('[data-dw-lead="frameworks_pack"]').first().click();
await page5.waitForSelector('.dwl-back.open');
await page5.fill('#dwl-name', 'A B');
await page5.fill('#dwl-email', 'a@b.co');
await page5.fill('#dwl-company', 'Cee');
await page5.click('#dwl-submit');
await page5.waitForSelector('#dwl-ok', { state: 'visible', timeout: 5000 });
ck('agent packed into body.role', (cap5.hits[0]?.role || '').includes('agent=chatgpt'), cap5.hits[0]?.role || '');
await page5.close();

// Additional: explicit ?agent= param should override
console.log('\n[5b] ?agent= param overrides referrer');
const page5b = await browser.newPage();
const cap5b = await armInterceptor(page5b);
await page5b.goto(BASE + '/data/?agent=perplexity', { waitUntil: 'networkidle' });
await page5b.locator('[data-dw-lead="dataset_onepager"]').first().click();
await page5b.waitForSelector('.dwl-back.open');
await page5b.fill('#dwl-name', 'A');
await page5b.fill('#dwl-email', 'a@b.co');
await page5b.fill('#dwl-company', 'C');
await page5b.click('#dwl-submit');
await page5b.waitForSelector('#dwl-ok', { state: 'visible', timeout: 5000 });
ck('?agent=perplexity captured', (cap5b.hits[0]?.role || '').includes('agent=perplexity'), cap5b.hits[0]?.role || '');
await page5b.close();

// ─── 6. Server failure keeps the form usable ───────────────────────────────
console.log('\n[6] Worker 500 keeps the form open and shows an error');
const page6 = await browser.newPage();
await armInterceptor(page6, { fail: true });
await page6.goto(BASE + '/advisory/', { waitUntil: 'networkidle' });
await page6.locator('[data-dw-lead="review_request"]').first().click();
await page6.waitForSelector('.dwl-back.open');
await page6.fill('#dwl-name', 'X');
await page6.fill('#dwl-email', 'x@y.co');
await page6.fill('#dwl-company', 'Z');
await page6.click('#dwl-submit');
await page6.waitForTimeout(500);
const stillOpen = await page6.locator('#dwl-form').isVisible();
const errShown = await page6.locator('#dwl-error').isVisible();
ck('form remains visible after failure', stillOpen);
ck('error surfaced after failure', errShown);
await page6.close();

await browser.close();
await server.close();

const failed = results.filter(r => !r.pass);
console.log(`\n${'='.repeat(58)}`);
console.log(`RESULT: ${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  failed.forEach(f => console.log(`  - ${f.name} ${f.detail}`));
  process.exit(1);
}
console.log('All lead-flow checks passed.');
