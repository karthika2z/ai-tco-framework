/**
 * /advisory/ — three tiers: free calculator, $399 kit, $5-15k TCO Review.
 *
 * Positioning: this is the only calculator on the internet whose model returns
 * "don't buy AI" for some roles (2 of 12 at mid level, more at junior levels).
 * That's the differentiator — a review from us is an honest one, because the
 * math is willing to say no.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { shell, esc, usd, SITE, YEAR } from './shell.mjs';

const ROOT = new URL('../', import.meta.url);
const OUT = new URL('./advisory/', ROOT);
mkdirSync(OUT, { recursive: true });

const roles = JSON.parse(readFileSync(new URL('./role-data.json', import.meta.url), 'utf8'));
const negRoles = roles.filter(r => r.annualSavings < 0);
const negNames = negRoles.map(r => r.label).join(' and ');

const canonical = `${SITE}/advisory/`;

const jsonld = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Service',
      serviceType: 'AI Total Cost of Ownership Advisory',
      provider: { '@type': 'Organization', name: 'DroidWork.ai', url: SITE },
      areaServed: 'Global',
      description: 'Independent AI TCO analysis for enterprise buyers. Three tiers: a free calculator, a self-serve business-case kit, and a bespoke TCO review delivered as a board-ready document.',
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'AI TCO Advisory Tiers',
        itemListElement: [
          {
            '@type': 'Offer',
            name: 'Free Calculator',
            price: '0',
            priceCurrency: 'USD',
            description: 'Full DroidWork TCO model, no login, PDF export.',
            url: `${SITE}/calculator/`,
          },
          {
            '@type': 'Offer',
            name: 'AI Business Case Kit',
            price: '399',
            priceCurrency: 'USD',
            description: 'Self-serve toolkit with model spreadsheet, board-deck template and worked examples across 12 roles.',
          },
          {
            '@type': 'Offer',
            name: 'TCO Review',
            priceSpecification: {
              '@type': 'PriceSpecification',
              price: '5000-15000',
              minPrice: '5000',
              maxPrice: '15000',
              priceCurrency: 'USD',
            },
            description: 'We run the model on your actual deployment and deliver a board-ready TCO document. Two-week engagement.',
          },
        ],
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        ['Why should I trust this analysis?', `Because the model publishes results that say "do not buy". Of the 12 roles we've modelled at mid level, ${negRoles.length} come back with AI costing more than the employee — ${negNames}. Vendor calculators cannot show this because their incentives point one way. Ours can, so it does.`],
        ['What does a TCO Review actually deliver?', 'A 15-25 page document sized for a CFO or a board committee: fully-loaded employee cost for every affected role, AI TCO across all seven cost dimensions, sensitivity to your top three assumptions, and a plain-English recommendation for each role. Everything is derived from a copy of the model configured to your inputs, so anyone can rerun it.'],
        ['How long does a TCO Review take?', 'Two weeks end-to-end. Week one: intake call, data collection, and model configuration. Week two: analysis, draft review, and final document. Rush timelines available at the top of the range.'],
        ['Do you take equity or referral fees from AI vendors?', 'No. The value of the review depends on it being independent, so we do not accept vendor referral, revenue-share or equity arrangements.'],
        ['What is the difference between the $399 kit and the review?', 'The kit is DIY: model spreadsheet, board-deck template, worked examples. You do the modelling. The review is done-for-you: we do the modelling on your deployment and deliver the document. Most buyers who care about accuracy pick the review; teams who want to learn the method pick the kit.'],
      ].map(([q, a]) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    },
  ],
};

const body = `
<div class="crumb"><a href="/">Home</a> › Advisory</div>
<div class="pill">Independent AI TCO Advisory · ${YEAR}</div>
<h1>Three ways to get an honest number.</h1>
<p class="lede">Free tool, self-serve kit, or a board-ready TCO Review. Pick the shape that fits how the decision needs to be defended.</p>

<div class="callout warn">
  <div class="callout-t">Why "independent" matters here</div>
  <p>Every AI ROI calculator you have used was built by someone who benefits when the answer is yes. Ours is built by someone who benefits when the answer is <em>right</em>. Our public model says AI costs more than the person for ${negRoles.length} of the 12 roles we publish (${esc(negNames)}) — if that gap does not exist in your deployment, we will say so. If it does, you save a budget cycle.</p>
</div>

<h2>The three tiers</h2>

<div class="rel" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;margin:22px 0">
  <div style="background:var(--navy-mid);border:1px solid var(--border);border-radius:13px;padding:22px">
    <div style="font-size:11px;font-weight:700;letter-spacing:.9px;text-transform:uppercase;color:var(--muted);margin-bottom:6px">Tier 1</div>
    <h3 style="margin:0 0 4px;font-size:19px">Calculator</h3>
    <div style="font-size:26px;font-weight:800;color:var(--white);margin-bottom:10px">Free</div>
    <p style="font-size:14.5px;color:#cfdae7">The complete model, no login, PDF executive summary at the end. About four minutes.</p>
    <ul style="margin:12px 0 18px 18px;font-size:14px;color:#cfdae7">
      <li>All 7 cost dimensions</li>
      <li>Role and level pre-fills</li>
      <li>Board-ready PDF export</li>
      <li>Open-source model</li>
    </ul>
    <a class="btn btn-ghost" href="/calculator/?utm_source=advisory&utm_medium=tier1" style="display:block;text-align:center">Open Calculator</a>
  </div>

  <div style="background:var(--navy-mid);border:2px solid var(--brand);border-radius:13px;padding:22px;position:relative">
    <div style="position:absolute;top:-11px;right:16px;background:var(--brand);color:#04241d;font-size:10.5px;font-weight:800;padding:4px 10px;border-radius:20px;letter-spacing:.5px">MOST POPULAR</div>
    <div style="font-size:11px;font-weight:700;letter-spacing:.9px;text-transform:uppercase;color:var(--brand);margin-bottom:6px">Tier 2</div>
    <h3 style="margin:0 0 4px;font-size:19px">AI Business Case Kit</h3>
    <div style="font-size:26px;font-weight:800;color:var(--white);margin-bottom:10px">$399<span style="font-size:14px;font-weight:600;color:var(--muted)"> · one-time</span></div>
    <p style="font-size:14.5px;color:#cfdae7">Self-serve toolkit for teams building their own case. You model it, we hand you the tooling to do it defensibly.</p>
    <ul style="margin:12px 0 18px 18px;font-size:14px;color:#cfdae7">
      <li>Full model spreadsheet (all 7 dimensions)</li>
      <li>Board-deck template (12 slides)</li>
      <li>Worked examples across 12 roles</li>
      <li>Sensitivity-analysis playbook</li>
      <li>90 days of email support</li>
    </ul>
    <a class="btn" href="#" data-dw-lead="kit_request" style="display:block;text-align:center">Request Kit</a>
  </div>

  <div style="background:var(--navy-mid);border:1px solid var(--border);border-radius:13px;padding:22px">
    <div style="font-size:11px;font-weight:700;letter-spacing:.9px;text-transform:uppercase;color:var(--gold);margin-bottom:6px">Tier 3</div>
    <h3 style="margin:0 0 4px;font-size:19px">TCO Review</h3>
    <div style="font-size:26px;font-weight:800;color:var(--white);margin-bottom:10px">$5k–$15k</div>
    <p style="font-size:14.5px;color:#cfdae7">We run the model on your actual deployment and deliver a board-ready document. Two weeks, one number, defensible.</p>
    <ul style="margin:12px 0 18px 18px;font-size:14px;color:#cfdae7">
      <li>Intake call and deployment discovery</li>
      <li>Model configured to your inputs</li>
      <li>15–25 page TCO document (PDF)</li>
      <li>Sensitivity on your top 3 assumptions</li>
      <li>Reviewer call to walk the numbers</li>
    </ul>
    <a class="btn" href="#" data-dw-lead="review_request" style="display:block;text-align:center">Book a Review</a>
  </div>
</div>

<h2>How the TCO Review actually runs</h2>
<div class="tri">
  <div class="tri-c"><h3>Week 1 · Intake</h3><p>A 60-minute discovery call, then we collect the workload data, security posture and roles in scope. If the answers are already clear, we say so and refund the difference.</p></div>
  <div class="tri-c"><h3>Week 2 · Model</h3><p>Model configured to your inputs, run across every role in scope. Sensitivity analysis on the three assumptions that move the answer the most.</p></div>
  <div class="tri-c"><h3>Delivery</h3><p>15–25 page PDF, a copy of the configured model, and a 45-minute walkthrough for your finance or board sponsor. All figures are reproducible.</p></div>
</div>

<h2>Who this is for</h2>
<p>Anyone whose next AI budget request has to survive a CFO or an audit committee. The people who benefit most from a review are:</p>
<ul style="margin:0 0 18px 20px;color:#cfdae7;font-size:15.5px">
  <li>CIOs approving a vendor deck that promises 80% savings and want to know what number they can actually defend</li>
  <li>Heads of ops evaluating replacement vs augmentation across a specific function</li>
  <li>Boards or investment committees who want an independent view before a large agentic deployment</li>
  <li>Founders raising on an "AI replaces the team" pitch and needing a defensible per-role figure</li>
</ul>

<h2>Frequently asked</h2>
<div class="faq"><h3>What does the review actually deliver?</h3><p>A 15–25 page document sized for a CFO or a board committee: fully-loaded employee cost per role, AI TCO across all seven cost dimensions, sensitivity to your top three assumptions, and a plain-English recommendation for each role. Plus the configured model — so anyone on your team can rerun it later.</p></div>
<div class="faq"><h3>Do you take vendor referral fees or equity?</h3><p>No. The whole reason the review is worth doing is that it is not tied to a vendor. We do not accept referral, revenue-share or equity arrangements with any AI infrastructure or model provider.</p></div>
<div class="faq"><h3>How is this different from what a consultancy would produce?</h3><p>A tier-1 consultancy delivers a slide deck built from interviews. We deliver a model, a document, and the configured spreadsheet. The number in the document is defensible because you can reproduce it, not because a partner signed off on it.</p></div>
<div class="faq"><h3>What if the review says "don't buy AI"?</h3><p>Then that is the review. Two of the twelve roles in our public dataset come back that way at mid level (${esc(negNames)}); more at junior levels. If yours land there, you have saved a budget cycle and a hiring reshuffle — which is worth a lot more than $5–15k.</p></div>
<div class="faq"><h3>Is the model open?</h3><p>Yes. The methodology and code are on <a href="https://github.com/karthika2z/ai-tco-framework">GitHub</a>. You can audit every assumption before hiring us.</p></div>

<div class="cta">
  <h2>Talk to us before your next AI budget review.</h2>
  <p class="cta-sub">15-minute intake. If a $0 or $399 tier is the right fit, we will say so — this is not a sales call.</p>
  <a class="btn" href="#" data-dw-lead="review_request" data-dw-lead-title="Book an Intake Call" data-dw-lead-submit="Request Intake">Book an Intake →</a>
  <p style="margin:14px 0 0;font-size:13px;color:var(--muted)">Or email <a href="mailto:karthik@droidwork.ai">karthik@droidwork.ai</a> directly.</p>
</div>

<p class="disc">Independent advisory only. No vendor referral or equity relationships. See our <a href="/calculator/methodology">methodology</a> and the <a href="https://github.com/karthika2z/ai-tco-framework">open-source model</a> before you engage.</p>`;

writeFileSync(new URL('./index.html', OUT), shell({
  title: `AI TCO Advisory — Calculator, Kit, and Board-Ready Review | DroidWork.ai`,
  desc: `Three tiers of independent AI TCO analysis: free calculator, $399 self-serve kit, $5-15k board-ready review. Model that publishes negative results.`,
  canonical,
  jsonld,
  body,
}));

console.log('  advisory/index.html');
