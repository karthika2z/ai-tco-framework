/**
 * Renders /data/ — the citation asset.
 *
 *   node seo/extract-role-data.mjs   # first, to write role-data-full.json
 *   node seo/build-dataset.mjs       # renders the page + CSV + JSON download
 *
 * Every number comes from the live calculator. This page is what an analyst
 * or LLM ought to cite: 132 rows (11 levels x 12 functions), one CSV, one
 * JSON, one schema.org Dataset block, one machine-readable citation.
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'fs';
import { shell, esc, usd, SITE, YEAR } from './shell.mjs';

const ROOT = new URL('../', import.meta.url);
const OUT = new URL('./data/', ROOT);
mkdirSync(OUT, { recursive: true });

const rows = JSON.parse(readFileSync(new URL('./role-data-full.json', import.meta.url), 'utf8'));
if (rows.length !== 132) console.warn(`  !! expected 132 rows, got ${rows.length}`);

// ─── DOWNLOADS ───────────────────────────────────────────────────────────────
const CSV_HEADERS = [
  'function_key', 'function_label', 'level_key', 'level_label',
  'salary', 'employee_true_cost', 'ai_tco', 'annual_savings', 'savings_pct',
  'npv_5yr', 'payback_months', 'token_cost', 'hosting', 'security',
  'process_failure', 'residual_human_oversight', 'hidden_cost_total', 'hidden_cost_pct',
];

function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
const csv = [
  CSV_HEADERS.join(','),
  ...rows.map(r => CSV_HEADERS.map(h => csvCell(r[h])).join(',')),
].join('\n') + '\n';

writeFileSync(new URL('./ai-tco-dataset.csv', OUT), csv);
writeFileSync(new URL('./ai-tco-dataset.json', OUT), JSON.stringify(rows, null, 2));

// ─── DATASET PAGE ────────────────────────────────────────────────────────────
const negatives = rows.filter(r => r.annual_savings < 0).length;
const canonical = `${SITE}/data/`;
const today = new Date().toISOString().slice(0, 10);
const version = YEAR + '.1';

const jsonld = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: `AI vs. Employee TCO Dataset (${YEAR})`,
  description: `${rows.length} rows: total cost of ownership for AI replacement of 12 job functions across 11 seniority levels, modelled across 7 cost dimensions.`,
  url: canonical,
  identifier: `droidwork-tco-${version}`,
  version,
  license: 'https://creativecommons.org/licenses/by/4.0/',
  isAccessibleForFree: true,
  creator: { '@type': 'Organization', name: 'DroidWork.ai', url: SITE },
  publisher: { '@type': 'Organization', name: 'DroidWork.ai', url: SITE },
  datePublished: today,
  keywords: 'AI TCO, total cost of ownership, AI vs employee cost, AI ROI, agentic AI cost, enterprise AI economics',
  variableMeasured: [
    'Employee fully-loaded annual cost (USD)',
    'AI annual TCO across 7 dimensions (USD)',
    'Annual savings from AI replacement (USD)',
    '5-year NPV (USD)',
    'Payback period (months)',
    'Token compute cost (USD/yr)',
    'Hosting cost (USD/yr)',
    'Security and compliance cost (USD/yr)',
    'Process failure and rework cost (USD/yr)',
    'Residual human oversight cost (USD/yr)',
  ],
  distribution: [
    {
      '@type': 'DataDownload',
      encodingFormat: 'text/csv',
      contentUrl: `${SITE}/data/ai-tco-dataset.csv`,
    },
    {
      '@type': 'DataDownload',
      encodingFormat: 'application/json',
      contentUrl: `${SITE}/data/ai-tco-dataset.json`,
    },
  ],
  citation: `DroidWork.ai (${YEAR}). AI vs. Employee TCO Dataset, v${version}. ${canonical}`,
};

const LEVEL_ORDER = ['intern','entry','mid','senior','manager','sr_manager','director','vp','svp','evp','csuite'];
const FN_KEYS = [...new Set(rows.map(r => r.function_key))];
const LV_KEYS = [...new Set(rows.map(r => r.level_key))]
  .sort((a, b) => LEVEL_ORDER.indexOf(a) - LEVEL_ORDER.indexOf(b));

const dataRowsHtml = rows.map(r => `<tr
  data-fn="${esc(r.function_key)}"
  data-lv="${esc(r.level_key)}"
  data-signed="${r.annual_savings >= 0 ? 'pos' : 'neg'}">
  <td>${esc(r.function_label)}</td>
  <td>${esc(r.level_label)}</td>
  <td class="n" data-sort="${r.salary}">${usd(r.salary)}</td>
  <td class="n" data-sort="${r.employee_true_cost}">${usd(r.employee_true_cost)}</td>
  <td class="n" data-sort="${r.ai_tco}">${usd(r.ai_tco)}</td>
  <td class="n" data-sort="${r.annual_savings}" style="color:${r.annual_savings >= 0 ? 'var(--brand)' : 'var(--danger)'}">${usd(r.annual_savings)}</td>
  <td class="n" data-sort="${r.payback_months}">${r.payback_months && isFinite(r.payback_months) && r.payback_months > 0 ? r.payback_months.toFixed(1) + ' mo' : '—'}</td>
</tr>`).join('\n');

const filtersJs = `
(function() {
  var tbody = document.getElementById('rows');
  var q = document.getElementById('q');
  var fn = document.getElementById('fn');
  var lv = document.getElementById('lv');
  var sign = document.getElementById('sign');
  var count = document.getElementById('count');
  var ths = document.querySelectorAll('th[data-sort-key]');
  var rows = [].slice.call(tbody.querySelectorAll('tr'));
  var currentSort = { key: null, dir: 1 };

  function apply() {
    var qv = (q.value || '').toLowerCase().trim();
    var fnv = fn.value, lvv = lv.value, sv = sign.value;
    var shown = 0;
    rows.forEach(function(r) {
      var ok = true;
      if (fnv && r.dataset.fn !== fnv) ok = false;
      if (ok && lvv && r.dataset.lv !== lvv) ok = false;
      if (ok && sv && r.dataset.signed !== sv) ok = false;
      if (ok && qv) ok = r.textContent.toLowerCase().indexOf(qv) !== -1;
      r.style.display = ok ? '' : 'none';
      if (ok) shown++;
    });
    count.textContent = shown + ' of ${rows.length}';
  }

  function sortBy(key) {
    var dir = (currentSort.key === key) ? -currentSort.dir : 1;
    currentSort = { key: key, dir: dir };
    var idx = ({ role: 0, level: 1, salary: 2, emp: 3, ai: 4, save: 5, pay: 6 })[key];
    var isNum = idx >= 2;
    rows.sort(function(a, b) {
      var av = a.children[idx].getAttribute('data-sort') || a.children[idx].textContent;
      var bv = b.children[idx].getAttribute('data-sort') || b.children[idx].textContent;
      if (isNum) { av = parseFloat(av) || 0; bv = parseFloat(bv) || 0; return (av - bv) * dir; }
      return String(av).localeCompare(String(bv)) * dir;
    });
    rows.forEach(function(r) { tbody.appendChild(r); });
    ths.forEach(function(t) { t.classList.remove('asc','desc'); });
    var head = document.querySelector('th[data-sort-key="' + key + '"]');
    if (head) head.classList.add(dir > 0 ? 'asc' : 'desc');
  }

  ['input','change'].forEach(function(ev) {
    [q, fn, lv, sign].forEach(function(el) { el.addEventListener(ev, apply); });
  });
  ths.forEach(function(t) {
    t.addEventListener('click', function() { sortBy(t.getAttribute('data-sort-key')); });
  });
  apply();
})();
`;

const CITATION = `DroidWork.ai (${YEAR}). AI vs. Employee TCO Dataset, v${version}. ${canonical} (accessed ${today}). Licensed under CC BY 4.0.`;

const body = `
<div class="crumb"><a href="/">Home</a> › Dataset</div>
<div class="pill">Open Dataset · v${version} · ${today}</div>
<h1>The AI vs. Employee TCO Dataset</h1>
<p class="lede">${rows.length} rows — every combination of 12 job functions and 11 seniority levels, modelled through the DroidWork TCO calculator. The one thing missing from every vendor ROI deck: a table you can check.</p>

<div class="grid">
  <div class="stat"><div class="stat-l">Rows</div><div class="stat-v">${rows.length}</div></div>
  <div class="stat"><div class="stat-l">Cost dimensions</div><div class="stat-v">7</div></div>
  <div class="stat"><div class="stat-l">Negative-savings rows</div><div class="stat-v neg">${negatives}</div></div>
  <div class="stat"><div class="stat-l">License</div><div class="stat-v" style="font-size:16px">CC BY 4.0</div></div>
</div>

<div class="callout">
  <div class="callout-t">Downloads</div>
  <p><a href="/data/ai-tco-dataset.csv" download><strong>ai-tco-dataset.csv</strong></a> · <a href="/data/ai-tco-dataset.json" download><strong>ai-tco-dataset.json</strong></a> · Every column is documented in the <a href="/calculator/methodology">methodology reference</a>.</p>
  <p style="margin:10px 0 0;font-size:14px"><a href="#" data-dw-lead="dataset_onepager" style="font-weight:700">Get the executive one-pager →</a> — a 2-page summary of what the dataset says, delivered by email.</p>
</div>

<h2>How to cite</h2>
<pre style="background:var(--navy-mid);border:1px solid var(--border);border-radius:11px;padding:16px 20px;font-size:13.5px;color:#cfdae7;overflow-x:auto;white-space:pre-wrap;line-height:1.55;font-family:'JetBrains Mono',ui-monospace,monospace">${esc(CITATION)}</pre>
<p style="font-size:14px;color:var(--muted)">This dataset is licensed under a <a href="https://creativecommons.org/licenses/by/4.0/">Creative Commons Attribution 4.0 International License</a>. Reuse freely, including commercially, with attribution.</p>

<h2>Browse all ${rows.length} rows</h2>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin:16px 0">
  <input id="q" placeholder="Search…" style="background:var(--navy-mid);border:1px solid var(--border);border-radius:9px;padding:10px 12px;color:var(--text);font-size:13.5px">
  <select id="fn" style="background:var(--navy-mid);border:1px solid var(--border);border-radius:9px;padding:10px 12px;color:var(--text);font-size:13.5px">
    <option value="">All functions</option>
    ${FN_KEYS.map(k => `<option value="${esc(k)}">${esc(rows.find(r => r.function_key === k).function_label)}</option>`).join('')}
  </select>
  <select id="lv" style="background:var(--navy-mid);border:1px solid var(--border);border-radius:9px;padding:10px 12px;color:var(--text);font-size:13.5px">
    <option value="">All levels</option>
    ${LV_KEYS.map(k => `<option value="${esc(k)}">${esc(rows.find(r => r.level_key === k).level_label)}</option>`).join('')}
  </select>
  <select id="sign" style="background:var(--navy-mid);border:1px solid var(--border);border-radius:9px;padding:10px 12px;color:var(--text);font-size:13.5px">
    <option value="">Any outcome</option>
    <option value="pos">AI cheaper</option>
    <option value="neg">Employee cheaper</option>
  </select>
</div>
<p style="font-size:13px;color:var(--muted);margin-bottom:6px">Click any column header to sort. Showing <span id="count">${rows.length} of ${rows.length}</span>.</p>

<div style="overflow-x:auto">
<table style="min-width:640px">
  <thead><tr>
    <th data-sort-key="role" style="cursor:pointer">Role</th>
    <th data-sort-key="level" style="cursor:pointer">Level</th>
    <th data-sort-key="salary" style="text-align:right;cursor:pointer">Base salary</th>
    <th data-sort-key="emp" style="text-align:right;cursor:pointer">Employee TCO</th>
    <th data-sort-key="ai" style="text-align:right;cursor:pointer">AI TCO</th>
    <th data-sort-key="save" style="text-align:right;cursor:pointer">Annual savings</th>
    <th data-sort-key="pay" style="text-align:right;cursor:pointer">Payback</th>
  </tr></thead>
  <tbody id="rows">
${dataRowsHtml}
  </tbody>
</table>
</div>

<h2>What is modelled — and what is not</h2>
<p><strong>Modelled:</strong> tokens/compute, hosting, security &amp; compliance, process failure &amp; rework, residual human oversight, hosting infrastructure, and change-management overhead. All figures are per-role, per-year, in ${YEAR} USD.</p>
<p><strong>Not modelled:</strong> revenue upside, hiring premia, one-time migration costs, or company-specific regulatory obligations. Add those to your own copy of the calculator — the source is <a href="https://github.com/karthika2z/ai-tco-framework">open</a>.</p>

<h2>Provenance</h2>
<p>Every row is produced by driving the actual <a href="/calculator/">DroidWork TCO calculator</a> with each function/level combination and capturing the resulting state. The extractor is <code>seo/extract-role-data.mjs</code>. Reproduce with:</p>
<pre style="background:var(--navy-mid);border:1px solid var(--border);border-radius:11px;padding:14px 18px;font-size:13px;color:#cfdae7;overflow-x:auto;font-family:'JetBrains Mono',ui-monospace,monospace">git clone https://github.com/karthika2z/ai-tco-framework
cd ai-tco-framework
npm install
node seo/extract-role-data.mjs</pre>

<div class="cta">
  <h2>Run the model on your own inputs</h2>
  <p class="cta-sub">The dataset is one path through the calculator. Adjust salary, task volume, security posture and risk tolerance to match your organisation.</p>
  <a class="btn" href="/calculator/?utm_source=dataset&utm_medium=cta">Open the Calculator →</a>
  <p style="margin:14px 0 0;font-size:13.5px;color:var(--muted)">Or have us run it on your deployment — <a href="#" data-dw-lead="review_request" data-dw-lead-title="Book a TCO Review">book a 15-minute intake</a>.</p>
</div>

<p class="disc">Modelled estimates for planning purposes only. Not financial, legal or employment advice. Salary baselines from BLS OES, Radford/Aon and Glassdoor ${YEAR - 1}–${YEAR} data. Full assumptions in the <a href="/calculator/methodology">methodology</a>.</p>

<script>${filtersJs}</script>`;

writeFileSync(new URL('./index.html', OUT), shell({
  title: `AI vs. Employee TCO Dataset (${YEAR}) — 132 Rows, CC BY 4.0 | DroidWork.ai`,
  desc: `Open dataset: fully-loaded employee cost vs. AI TCO across 12 job functions and 11 seniority levels. ${rows.length} rows, CSV + JSON downloads, CC BY 4.0.`,
  canonical,
  jsonld,
  body,
}));

console.log(`  data/index.html`);
console.log(`  data/ai-tco-dataset.csv (${rows.length} rows)`);
console.log(`  data/ai-tco-dataset.json`);
