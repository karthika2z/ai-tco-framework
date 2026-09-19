/**
 * Generates the /roles/* programmatic landing pages.
 *
 *   node seo/extract-role-data.mjs   # pull real numbers from the calculator
 *   node seo/build-role-pages.mjs    # render the pages
 *
 * Every number on these pages comes from role-data.json, which comes from the
 * live calculator. Nothing here is hand-written arithmetic.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { ROLE_CONTENT } from './role-content.mjs';
import { CSS, shell, usd, esc, SITE, YEAR } from './shell.mjs';

const ROOT = new URL('../', import.meta.url);
const rows = JSON.parse(readFileSync(new URL('./role-data.json', import.meta.url), 'utf8'));




// ─── ROLE PAGE ───────────────────────────────────────────────────────────────
function rolePage(r) {
  const c = ROLE_CONTENT[r.key];
  if (!c) throw new Error(`Missing editorial content for role "${r.key}"`);

  const positive = r.annualSavings >= 0;
  const tokenPct = r.aiTCO ? (r.tokenCost / r.aiTCO) * 100 : 0;
  const nonToken = 100 - tokenPct;
  const payback = isFinite(r.payback) && r.payback > 0 ? r.payback.toFixed(1) + ' months' : 'No payback';

  const title = `AI vs. ${c.h1Role.replace(/^an? /, '')}: True Cost Comparison (${YEAR}) | DroidWork.ai`;
  const desc = `What it really costs to replace ${c.h1Role} with AI. Fully-loaded employee cost ${usd(r.empTrueCost)} vs. AI TCO ${usd(r.aiTCO)} across 7 cost dimensions — including the ${Math.round(nonToken)}% vendors leave out.`;
  const canonical = `${SITE}/roles/${r.slug}/`;
  const deepLink = `/calculator/?role=${r.key}&level=${r.level}&utm_source=seo&utm_medium=role_page&utm_campaign=${r.slug}`;

  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: `AI vs. ${c.h1Role}: True Cost Comparison (${YEAR})`,
        description: desc,
        author: { '@type': 'Organization', name: 'DroidWork.ai', url: SITE },
        publisher: { '@type': 'Organization', name: 'DroidWork.ai', url: SITE },
        mainEntityOfPage: canonical,
        datePublished: new Date().toISOString().slice(0, 10),
      },
      {
        '@type': 'FAQPage',
        mainEntity: c.faqs.map(([q, a]) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ],
  };

  const related = rows.filter(x => x.key !== r.key).slice(0, 4).map(x => {
    const rc = ROLE_CONTENT[x.key];
    return `<a href="/roles/${x.slug}/">AI vs. ${esc(rc.h1Role.replace(/^an? /, ''))}
      <span>${x.annualSavings >= 0 ? usd(x.annualSavings) + ' modelled saving' : 'AI costs more'}</span></a>`;
  }).join('\n');

  const body = `
<div class="crumb"><a href="/">Home</a> › <a href="/roles/">Roles</a> › ${esc(c.h1Role.replace(/^an? /, ''))}</div>
<div class="pill">Role-Level TCO Analysis · ${YEAR}</div>
<h1>AI vs. ${esc(c.h1Role.replace(/^an? /, ''))}: What Replacement Actually Costs</h1>
<p class="lede">${esc(c.angle)}</p>

<div class="grid">
  <div class="stat"><div class="stat-l">Employee True Cost</div><div class="stat-v">${usd(r.empTrueCost)}</div></div>
  <div class="stat"><div class="stat-l">AI Full TCO</div><div class="stat-v">${usd(r.aiTCO)}</div></div>
  <div class="stat"><div class="stat-l">Annual Difference</div>
    <div class="stat-v ${positive ? 'pos' : 'neg'}">${usd(r.annualSavings)}</div></div>
  <div class="stat"><div class="stat-l">Payback Period</div><div class="stat-v">${esc(payback)}</div></div>
</div>

<p>These figures come from the DroidWork TCO model for ${esc(c.h1Role)} at mid level, on a base salary of
${usd(r.salary)}. The employee figure is fully loaded — benefits, payroll tax, overhead, management time and
recruiting amortisation — not base salary. The AI figure sums all seven cost dimensions, not tokens alone.</p>

${!positive ? `<div class="callout warn">
  <div class="callout-t">Counterintuitive result</div>
  <p>For this role our model shows AI costing <strong>${usd(Math.abs(r.annualSavings))} more per year</strong>
  than the employee. We publish this rather than hiding it. The fixed costs of a compliant AI deployment —
  security, pipelines, oversight — do not scale down to match a moderately paid role.</p>
</div>` : ''}

<h2>Where the money actually goes</h2>
<p>Token cost is <strong>${tokenPct.toFixed(1)}%</strong> of total AI cost for this role. The remaining
<strong>${nonToken.toFixed(1)}%</strong> is what standard vendor ROI models omit.</p>

<table>
  <thead><tr><th>Cost dimension</th><th style="text-align:right">Annual</th></tr></thead>
  <tbody>
    <tr><td>Tokens / compute</td><td class="n">${usd(r.tokenCost)}</td></tr>
    <tr><td>Hosting &amp; infrastructure</td><td class="n">${usd(r.hosting)}</td></tr>
    <tr><td>Security &amp; compliance</td><td class="n">${usd(r.security)}</td></tr>
    <tr><td>Process failure &amp; rework</td><td class="n">${usd(r.processFail)}</td></tr>
    <tr><td>Residual human oversight</td><td class="n">${usd(r.residualHuman)}</td></tr>
    <tr><td><strong>Total AI TCO</strong></td><td class="n">${usd(r.aiTCO)}</td></tr>
  </tbody>
</table>

<div class="callout">
  <div class="callout-t">Dominant cost driver for this role</div>
  <p>${esc(c.costDriver)}</p>
</div>

<h2>What AI does well here</h2>
<p>${esc(c.automatable)}</p>

<h2>What stays human</h2>
<p>${esc(c.resistant)}</p>

<h2>The honest verdict</h2>
<p>${esc(c.verdict)}</p>

<div class="cta">
  <h2>Run this for your own numbers</h2>
  <p class="cta-sub">Pre-filled for ${esc(c.h1Role)}. Adjust salary, volume and risk to match your business —
  then export a board-ready PDF. Free, no login, about four minutes.</p>
  <a class="btn" href="${deepLink}">Open the Calculator for This Role →</a>
</div>

<h2>Frequently asked</h2>
${c.faqs.map(([q, a]) => `<div class="faq"><h3>${esc(q)}</h3><p>${esc(a)}</p></div>`).join('\n')}

<h2>Compare other roles</h2>
<div class="rel">${related}</div>

<p class="disc">Modelled estimate for planning purposes only; not financial, legal or employment advice.
Salary baselines from BLS OES, Radford/Aon and Glassdoor ${YEAR - 1}–${YEAR} data. Full assumptions and sources are
documented in the <a href="/calculator/methodology">methodology</a>, and the model is
<a href="https://github.com/karthika2z/ai-tco-framework">open source</a>. Your results will differ —
that is the point; run your own inputs.</p>`;

  return shell({ title, desc, canonical, jsonld, body });
}

// ─── HUB PAGE ────────────────────────────────────────────────────────────────
function hubPage() {
  const sorted = [...rows].sort((a, b) => b.annualSavings - a.annualSavings);
  const cheaper = sorted.filter(r => r.annualSavings < 0);

  const body = `
<div class="crumb"><a href="/">Home</a> › Roles</div>
<div class="pill">Role Comparison Index · ${YEAR}</div>
<h1>AI vs. Employee Cost, by Role</h1>
<p class="lede">Twelve roles modelled end to end across seven cost dimensions — including
${cheaper.length} where our model says AI costs more than the person.</p>

<p>Every figure below is generated directly from the
<a href="/calculator/">DroidWork TCO calculator</a> at mid level, using fully-loaded employee cost rather than
base salary. Click any role for the full breakdown, or open the calculator to run your own inputs.</p>

<table>
  <thead><tr><th>Role</th><th style="text-align:right">Employee</th><th style="text-align:right">AI TCO</th>
  <th style="text-align:right">Difference</th></tr></thead>
  <tbody>
  ${sorted.map(r => {
    const rc = ROLE_CONTENT[r.key];
    return `<tr>
      <td><a href="/roles/${r.slug}/">${esc(rc.h1Role.replace(/^an? /, ''))}</a></td>
      <td class="n">${usd(r.empTrueCost)}</td>
      <td class="n">${usd(r.aiTCO)}</td>
      <td class="n" style="color:${r.annualSavings >= 0 ? 'var(--brand)' : 'var(--danger)'}">${usd(r.annualSavings)}</td>
    </tr>`;
  }).join('\n')}
  </tbody>
</table>

<div class="callout warn">
  <div class="callout-t">Why we publish the negative results</div>
  <p>Most AI ROI calculators are built by vendors who sell AI, so every result favours adoption. Our model
  shows ${cheaper.length} of 12 roles where replacement costs more than it saves. If a number here disagrees
  with a vendor deck, check whose incentives are in the model.</p>
</div>

<div class="cta">
  <h2>Model your own role</h2>
  <p class="cta-sub">Adjust salary, task volume, concurrency and risk tolerance — then export a
  board-ready PDF executive summary.</p>
  <a class="btn" href="/calculator/?utm_source=seo&utm_medium=role_hub">Open the Calculator →</a>
</div>

<p class="disc">Modelled estimates for planning purposes only; not financial, legal or employment advice.
Methodology and sources: <a href="/calculator/methodology">full technical reference</a>.</p>`;

  return shell({
    title: `AI vs. Employee Cost by Role — ${YEAR} TCO Comparison | DroidWork.ai`,
    desc: `Twelve roles compared: fully-loaded employee cost vs. complete AI TCO across 7 dimensions. Includes ${cheaper.length} roles where AI costs more than the employee.`,
    canonical: `${SITE}/roles/`,
    jsonld: {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `AI vs. Employee Cost by Role (${YEAR})`,
      itemListElement: sorted.map((r, i) => ({
        '@type': 'ListItem', position: i + 1,
        name: `AI vs. ${ROLE_CONTENT[r.key].h1Role.replace(/^an? /, '')}`,
        url: `${SITE}/roles/${r.slug}/`,
      })),
    },
    body,
  });
}

// ─── WRITE ───────────────────────────────────────────────────────────────────
mkdirSync(new URL('./roles/', ROOT), { recursive: true });
writeFileSync(new URL('./roles/index.html', ROOT), hubPage());
console.log('  roles/index.html');

for (const r of rows) {
  const dir = new URL(`./roles/${r.slug}/`, ROOT);
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL('index.html', dir), rolePage(r));
  console.log(`  roles/${r.slug}/index.html`);
}

// Sitemap + robots
const urls = [
  { loc: `${SITE}/`, pri: '1.0' },
  { loc: `${SITE}/calculator/`, pri: '0.9' },
  { loc: `${SITE}/calculator/methodology`, pri: '0.8' },
  { loc: `${SITE}/roles/`, pri: '0.8' },
  ...rows.map(r => ({ loc: `${SITE}/roles/${r.slug}/`, pri: '0.7' })),
];
const today = new Date().toISOString().slice(0, 10);
writeFileSync(new URL('./sitemap.xml', ROOT),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><priority>${u.pri}</priority></url>`).join('\n')}
</urlset>
`);
writeFileSync(new URL('./robots.txt', ROOT),
  `User-agent: *\nAllow: /\n\n# AI crawlers welcome — being cited is the distribution strategy.\nUser-agent: GPTBot\nAllow: /\nUser-agent: ClaudeBot\nAllow: /\nUser-agent: PerplexityBot\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

console.log(`  sitemap.xml (${urls.length} urls)\n  robots.txt\n\nGenerated ${rows.length} role pages + hub.`);
