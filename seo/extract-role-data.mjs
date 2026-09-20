/**
 * Extracts REAL TCO numbers from the live calculator.
 *
 * Two output files:
 *   - seo/role-data.json       (12 roles at mid level, used by /roles/ pages)
 *   - seo/role-data-full.json  (11 levels x 12 functions = 132 rows, used by /data/)
 *
 * Why drive the actual calculator instead of hardcoding numbers: the pages
 * must agree with the model exactly. If the methodology changes, re-run this
 * and every downstream page stays truthful. Invented numbers on an SEO page
 * would undermine the one thing this site sells — credibility with a CFO.
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { startServer } from './serve.mjs';

export const FUNCTIONS = [
  { key: 'swe',       label: 'Software Engineer',        slug: 'software-engineer' },
  { key: 'ds',        label: 'Data Scientist',           slug: 'data-scientist' },
  { key: 'pm',        label: 'Product Manager',          slug: 'product-manager' },
  { key: 'finance',   label: 'Financial Analyst',        slug: 'financial-analyst' },
  { key: 'hr',        label: 'HR Generalist',            slug: 'hr-generalist' },
  { key: 'ops',       label: 'Operations Analyst',       slug: 'operations-analyst' },
  { key: 'marketing', label: 'Marketing Manager',        slug: 'marketing-manager' },
  { key: 'sales',     label: 'Sales Representative',     slug: 'sales-representative' },
  { key: 'legal',     label: 'Legal Counsel',            slug: 'legal-counsel' },
  { key: 'cs',        label: 'Customer Support Agent',   slug: 'customer-support-agent' },
  { key: 'it',        label: 'IT Support Specialist',    slug: 'it-support-specialist' },
  { key: 'strategy',  label: 'Strategy Consultant',      slug: 'strategy-consultant' },
];

export const LEVELS = [
  { key: 'intern',     label: 'Intern' },
  { key: 'entry',      label: 'Entry' },
  { key: 'mid',        label: 'Mid' },
  { key: 'senior',     label: 'Senior' },
  { key: 'manager',    label: 'Manager' },
  { key: 'sr_manager', label: 'Senior Manager' },
  { key: 'director',   label: 'Director' },
  { key: 'vp',         label: 'VP' },
  { key: 'svp',        label: 'SVP' },
  { key: 'evp',        label: 'EVP' },
  { key: 'csuite',     label: 'C-Suite' },
];

const PRIMARY_LEVEL = 'mid';

async function extractRow(page, fn, lv) {
  return page.evaluate(({ key, level }) => {
    const fnSel = document.getElementById('p_function');
    const lvSel = document.getElementById('p_level');
    fnSel.value = key;
    // Some levels are hidden — assigning .value still works.
    lvSel.value = level;
    if (typeof updateSalaryFromProfile === 'function') updateSalaryFromProfile();
    else if (typeof calc === 'function') calc();
    const s = window._calcState || {};
    return {
      salary:        s.salary,
      empTrueCost:   s.empTrueCostN,
      aiTCO:         s.cloudAIAnnual,
      annualSavings: s.annualSavings,
      savingsPct:    s.savingsPct,
      npv:           s.npvTotal,
      payback:       s.paybackMonths,
      tokenCost:     s.cloudAIToken,
      hiddenTotal:   s.hiddenTotal,
      hiddenPct:     s.hiddenPct,
      security:      s.annualSecurity,
      hosting:       s.annualHosting,
      processFail:   s.annualProcessFail,
      residualHuman: s.residualHuman,
    };
  }, { key: fn, level: lv });
}

const { url: BASE, close: closeServer } = await startServer(8099);
console.log(`Local server: ${BASE}`);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`${BASE}/calculator/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);

// ─── PRIMARY ROWS (role-data.json) ────────────────────────────────────────────
const primary = [];
for (const fn of FUNCTIONS) {
  const data = await extractRow(page, fn.key, PRIMARY_LEVEL);
  if (!data || typeof data.empTrueCost !== 'number') {
    console.error(`  !! ${fn.key} @ ${PRIMARY_LEVEL}: no state extracted`);
    continue;
  }
  primary.push({ ...fn, level: PRIMARY_LEVEL, ...data });
  console.log(
    `  ${fn.label.padEnd(26)} emp $${Math.round(data.empTrueCost).toLocaleString()}` +
    `  ai $${Math.round(data.aiTCO).toLocaleString()}` +
    `  save $${Math.round(data.annualSavings).toLocaleString()}` +
    `  token ${data.aiTCO ? Math.round((data.tokenCost / data.aiTCO) * 100) : '?'}%`
  );
}
writeFileSync(new URL('./role-data.json', import.meta.url), JSON.stringify(primary, null, 2));
console.log(`\nExtracted ${primary.length}/${FUNCTIONS.length} primary roles -> seo/role-data.json`);

// ─── FULL MATRIX (role-data-full.json) ────────────────────────────────────────
console.log('\nBuilding full 11-level x 12-function matrix ...');
const full = [];
for (const lv of LEVELS) {
  for (const fn of FUNCTIONS) {
    const data = await extractRow(page, fn.key, lv.key);
    if (!data || typeof data.empTrueCost !== 'number') {
      console.error(`  !! ${fn.key} @ ${lv.key}: no state extracted`);
      continue;
    }
    full.push({
      function_key: fn.key,
      function_label: fn.label,
      function_slug: fn.slug,
      level_key: lv.key,
      level_label: lv.label,
      salary: Math.round(data.salary),
      employee_true_cost: Math.round(data.empTrueCost),
      ai_tco: Math.round(data.aiTCO),
      annual_savings: Math.round(data.annualSavings),
      savings_pct: data.savingsPct,
      npv_5yr: Math.round(data.npv),
      payback_months: data.payback,
      token_cost: Math.round(data.tokenCost),
      hosting: Math.round(data.hosting),
      security: Math.round(data.security),
      process_failure: Math.round(data.processFail),
      residual_human_oversight: Math.round(data.residualHuman),
      hidden_cost_total: Math.round(data.hiddenTotal),
      hidden_cost_pct: data.hiddenPct,
    });
  }
  const inLevel = full.filter(r => r.level_key === lv.key).length;
  const neg = full.filter(r => r.level_key === lv.key && r.annual_savings < 0).length;
  console.log(`  ${lv.label.padEnd(15)} ${inLevel}/12 rows  · ${neg} negative-savings`);
}

writeFileSync(new URL('./role-data-full.json', import.meta.url), JSON.stringify(full, null, 2));
console.log(`\nExtracted ${full.length}/${LEVELS.length * FUNCTIONS.length} full rows -> seo/role-data-full.json`);

await browser.close();
await closeServer();
