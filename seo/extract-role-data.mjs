/**
 * Extracts REAL TCO numbers from the live calculator, one row per role.
 *
 * Why drive the actual calculator instead of hardcoding numbers: the role pages
 * must agree with the model exactly. If the methodology changes, re-run this and
 * the pages stay truthful. Invented numbers on an SEO page would undermine the
 * one thing this site sells — credibility with a CFO.
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE = 'http://127.0.0.1:8099';
const LEVEL = 'mid';

const ROLES = [
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

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
});
const page = await browser.newPage();
await page.goto(`${BASE}/calculator/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

const rows = [];
for (const role of ROLES) {
  const data = await page.evaluate(({ key, level }) => {
    const fn = document.getElementById('p_function');
    const lv = document.getElementById('p_level');
    fn.value = key;
    lv.value = level;
    if (typeof updateSalaryFromProfile === 'function') updateSalaryFromProfile();
    else calc();
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
  }, { key: role.key, level: LEVEL });

  if (!data || typeof data.empTrueCost !== 'number') {
    console.error(`  !! ${role.key}: no state extracted`);
    continue;
  }
  rows.push({ ...role, level: LEVEL, ...data });
  console.log(
    `  ${role.label.padEnd(26)} emp $${Math.round(data.empTrueCost).toLocaleString()}` +
    `  ai $${Math.round(data.aiTCO).toLocaleString()}` +
    `  save $${Math.round(data.annualSavings).toLocaleString()}` +
    `  token ${data.aiTCO ? Math.round((data.tokenCost / data.aiTCO) * 100) : '?'}%`
  );
}

await browser.close();
writeFileSync(new URL('./role-data.json', import.meta.url), JSON.stringify(rows, null, 2));
console.log(`\nExtracted ${rows.length}/${ROLES.length} roles -> seo/role-data.json`);
