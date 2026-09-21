/**
 * Generates /insights/* — the authority content that makes DroidWork citable.
 *
 * Strategy note: the calculator answers "what does agentic AI cost?". These
 * essays answer "why does it cost that?". Citation-dense, framework-driven
 * writing is what large language models quote when someone asks about AI
 * governance — and being the cited source is the distribution strategy.
 *
 * Run AFTER build-role-pages.mjs: this script also writes the full sitemap
 * covering both sections.
 *
 *   node seo/build-role-pages.mjs && node seo/build-insights.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { CSS, shell, esc, SITE, YEAR } from './shell.mjs';

const ROOT = new URL('../', import.meta.url);
const roles = JSON.parse(readFileSync(new URL('./role-data.json', import.meta.url), 'utf8'));
const AUTHOR = 'Karthik Balachandran';
const AUTHOR_URL = 'https://www.linkedin.com/in/kbalachandran';

const REFS = [
  ['Jabbour, S., et al. (2023). Measuring the impact of AI in the diagnosis of hospitalized patients. <em>JAMA</em>, 330(23), 2275–2284.', 'https://doi.org/10.1001/jama.2023.22295'],
  ['Lee, H.-P., et al. (2025). The impact of generative AI on critical thinking. <em>CHI 2025</em>.', 'https://dl.acm.org/doi/10.1145/3706598.3713778'],
  ['Anderson, B. B., et al. (2016). From warning to wallpaper: why the brain habituates to security warnings. <em>Journal of Management Information Systems</em>, 33(3), 713–743.', 'https://doi.org/10.1080/07421222.2016.1243947'],
  ['van der Sijs, H., et al. (2006). Overriding of drug safety alerts in computerized physician order entry. <em>JAMIA</em>, 13(2), 138–147.', 'https://doi.org/10.1197/jamia.M1809'],
  ['Parasuraman, R., &amp; Manzey, D. H. (2010). Complacency and bias in human use of automation. <em>Human Factors</em>, 52(3), 381–410.', 'https://doi.org/10.1177/0018720810376055'],
  ['Elish, M. C. (2019). Moral crumple zones: cautionary tales in human-robot interaction. <em>Engaging Science, Technology, and Society</em>, 5, 40–60.', 'https://estsjournal.org/index.php/ests/article/view/260'],
  ['Bainbridge, L. (1983). Ironies of automation. <em>Automatica</em>, 19(6), 775–779.', 'https://doi.org/10.1016/0005-1098(83)90046-8'],
];

export const ARTICLES = [{
  slug: 'human-in-the-loop-will-not-protect-your-ai-agents',
  title: 'A Human in the Loop Will Not Protect Your AI Agents',
  dek: 'What decades of human-factors research says about HITL — and why your approval checkpoint is a signature, not a safeguard.',
  desc: 'Human approval is not a safeguard for AI agents; it is a record of where blame lands. Seven peer-reviewed studies on automation complacency, and what to build instead: Constrain, Escalate, Contain.',
  keywords: 'human in the loop, HITL, AI agent governance, automation complacency, AI safety, agentic AI security, zero trust AI',
  published: '2026-09-19',
  body: `
<h2>The box that is doing less than you think</h2>
<p>Picture this: you are in a meeting where an AI workflow is being reviewed for final approval. Someone asks a
safety question. The project owner replies: <em>"Don't worry, there's a human in the loop. Nothing happens
without approval."</em> The architecture gets a new box labelled "human review", and the meeting moves on.</p>

<blockquote>In most deployments, human approval is not a safeguard. It's a signature. It tells you where the
blame lands when something goes wrong, not who is in control.</blockquote>

<h2>The problem is what we ask the human to do</h2>
<p>The research on this goes back decades, and it points in one direction.</p>
<p><strong>People are bad at watching a system that is right most of the time and catching the rare misses.</strong>
Attention fades, trust builds, and approvals turn into muscle memory. This has nothing to do with laziness or
skill. It is simply how attention works.</p>
<p><strong>People are much better at rare, high-stakes judgement:</strong> reacting to an alarm that almost never
fires, making the call that obviously matters, bringing context the system does not have.</p>
<p>Our HITL designs demand the first thing and never use the second. That is the core problem.</p>

<h2>Three studies worth knowing</h2>
<p>If you want to push back on a "we have human in the loop" answer in your next architecture review, bring these.</p>

<div class="study">
  <div class="study-src">JAMA · 2023 · 457 clinicians</div>
  <p>Clinicians were given deliberately biased AI assistance for diagnosis. Their accuracy dropped from
  <strong>73% to 62%</strong>. These were trained physicians, looking at cases they knew how to handle. They
  deferred to the tool anyway.</p>
</div>
<div class="study">
  <div class="study-src">CHI · 2025 · 319 knowledge workers</div>
  <p>Surveying knowledge workers using generative AI on real tasks: the more people trusted the AI, the
  <strong>less critical thinking</strong> they applied to its output. Trust in the system displaced scrutiny.</p>
</div>
<div class="study">
  <div class="study-src">The checkpoint problem · JMIS · 2016</div>
  <p>Brain-imaging research found the neural response to repeated security warnings drops off after a handful of
  exposures. Every "Approve?" dialog you add trains the click. <strong>Ten checkpoints do not give you ten layers
  of review. They give you one tired reviewer spread ten ways.</strong></p>
</div>

<p>There is a material side effect. The better your agent gets, the faster this decay runs. An agent that is
right 95% of the time teaches its reviewer that checking does not pay. <strong>Reliability trains negligence.</strong></p>

<p>None of this is new. Lisanne Bainbridge wrote it up in 1983: automation removes the practice that builds
skill, then expects a de-skilled human to catch the machine's rare failures. We rebuilt her trap for AI agents
and put it on the compliance slide. And when it fails, the reviewer becomes the crumple zone — the person
absorbs the impact so the system does not have to.</p>

<h2>What to build instead: Constrain, Escalate, Contain</h2>
<p>You do not fix this by asking humans to try harder. You fix it the way we fixed everything else in
infrastructure: assume the fallible component will fail, and design around it. Treat human attention as a
scarce resource.</p>

<div class="tri">
  <div class="tri-c"><h3>Constrain by default</h3>
    <p>Decide what the agent cannot do before it ever runs. Least privilege, scoped access, and policy checks
    that block prohibited actions at pre-check and at runtime. This matters most for irreversible operations:
    deleting data, sending it outside your boundary, lateral access to crown jewels.</p></div>
  <div class="tri-c"><h3>Escalate by exception</h3>
    <p>Save human approval for decisions that are rare, consequential and hard to undo — then give that person
    real context and real authority to say no. A reviewer who sees three meaningful decisions a week is a judge.
    A reviewer who sees three hundred is a clicker.</p></div>
  <div class="tri-c"><h3>Contain on failure</h3>
    <p>Something will get through. Plan for it. Detection that flags abnormal behaviour, circuit breakers that
    halt the agent on defined conditions, and a kill switch that revokes credentials immediately. This is the
    one job humans are actually built for: responding hard when a rare alarm fires.</p></div>
</div>

<p>In the cloud, almost everything an agent does crosses the network, which makes the network a distributed
enforcement mechanism. Pair it with identity and policy controls that understand what the agent is actually
requesting, and you have containment that works.</p>

<h2>The point</h2>
<p>Use people where judgement is scarce and the stakes are high. Use infrastructure where enforcement has to be
constant, fast and complete. Build it so neither one has to be perfect.</p>`,

  faqs: [
    ['Does human-in-the-loop make AI agents safe?', 'Not on its own. Human approval degrades predictably when a system is right most of the time — a well-documented effect called automation complacency. A JAMA study of 457 clinicians found accuracy fell from 73% to 62% under biased AI assistance. HITL records accountability; it does not provide control.'],
    ['Why does a more reliable AI agent make human review worse?', 'Because reliability trains negligence. An agent that is correct 95% of the time teaches its reviewer that checking rarely pays, so scrutiny decays. The better the agent performs, the faster the reviewer habituates.'],
    ['What should replace human-in-the-loop for AI agents?', 'A three-layer design: constrain by default with least privilege and runtime policy checks; escalate by exception so humans see only rare, consequential and hard-to-undo decisions; and contain on failure with anomaly detection, circuit breakers and an immediate kill switch.'],
    ['Do more approval checkpoints improve AI safety?', 'No. Research on warning habituation shows the neural response to repeated warnings drops sharply after a few exposures. Ten checkpoints do not produce ten layers of review — they produce one reviewer whose attention is divided ten ways.'],
  ],
}, {
  slug: 'the-forward-deployed-engineer-quadrant',
  title: 'Where Forward Deployed Engineer Demand Comes From',
  dek: 'AI deployments do not slot into a standard product delivered by a standard SA. They drag placements out of Systems Integration and into a different quadrant — where both product and workflow have to bend at the same time.',
  desc: 'A 2x2 for placement models: workflow integration complexity vs product customization required. AI deployments are dragging demand out of Systems Integration and into Forward Deployment.',
  keywords: 'forward deployed engineer, FDE, deployment model, solutions architect, AI go-to-market, agentic deployment, enterprise AI delivery, Palantir FDE',
  published: '2026-09-19',
  refs: false,
  body: `
<h2>Why placement models matter for AI cost</h2>
<p>Every enterprise AI deployment sits inside a delivery model, and delivery models come with structural cost signatures. A product that ships as off-the-shelf SaaS scales without adding people. A product delivered as bespoke services adds a person to every account. What separates the two is not the code — it is where on the deployment map the product actually lands.</p>

<blockquote>AI deployments are dragging placements out of Systems Integration and into Forward Deployment. If your delivery model has not moved with them, your margin structure has not caught up.</blockquote>

<h2>The Deployment Model Map</h2>
<p>A 2×2 on two axes: <strong>workflow integration complexity</strong> (how much the customer's process has to change to absorb your product) and <strong>product customization required</strong> (how much your product has to change to fit the customer). Where you land determines what role does the deploying — and what that role costs to run.</p>

<div class="tri" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px">
  <div class="tri-c">
    <h3>Off-the-Shelf SaaS · Low / Low</h3>
    <p><strong>Neither bends.</strong> Standard product dropped into a standard process. Value shows up in the first session. <em>Owned by: Support · Customer Success.</em> Product-led, seats scale without adding people. Nobody needs to be in the room with the customer.</p>
  </div>
  <div class="tri-c">
    <h3>Systems Integration · High / Low</h3>
    <p><strong>Workflow bends, product does not.</strong> A standard enterprise platform pushed into legacy data models, security review, and undocumented handoffs. <em>Owned by: Solutions Architect · Implementation Consultant.</em> Fixed-scope SOW. Ends when the scope ends. <strong>Your SAs are placed here.</strong></p>
  </div>
  <div class="tri-c">
    <h3>Bespoke Services · Low / High</h3>
    <p><strong>Product bends, workflow does not.</strong> A build from scratch for one client. Deep customization, nothing carried forward. <em>Owned by: contract engineering · dev shop.</em> Headcount-bound. No core IP. Margin falls as you grow. Gets dragged upward as clients ask for more.</p>
  </div>
  <div class="tri-c" style="border-top-color:var(--gold)">
    <h3>Forward Deployment · High / High</h3>
    <p><strong>Both bend, at the same time.</strong> The product is defining a new category and the workflow is still evolving. Requirements are uncovered by working alongside operations. <em>Owned by: Forward Deployed Engineer.</em> Reusable primitives; client needs feed the core product. <strong>Where the work is moving.</strong></p>
  </div>
</div>

<h2>Why AI deployments end up in the top-right</h2>
<p>Three forces, all present in every enterprise agentic rollout:</p>
<ul>
  <li><strong>The workflow is still being invented.</strong> The customer does not know how their process changes when an agent enters it — because the agent hasn't run yet. Requirements have to be uncovered, not gathered.</li>
  <li><strong>The product has to bend.</strong> The reference architecture for an "agentic assistant for finance" does not exist yet. The FDE brings back constraints — data-access shape, escalation policy, evaluation harness — that become primitives in the core product.</li>
  <li><strong>Both edges compound.</strong> Systems Integration teams cannot land AI, because the product isn't finished; bespoke services teams cannot land AI, because the workflow isn't finished. The FDE role exists because that is the shape of the work.</li>
</ul>

<h2>What this means for your budget</h2>
<p>If your AI vendor's delivery motion is priced like Systems Integration — fixed-scope SOW, SA-led, ends when the scope ends — expect one of three things: the scope will overrun, the product will not carry customer-specific learning back into the core, or the customer will build the missing 30% themselves and unbundle you.</p>

<p>If your <em>own</em> deployment plan assumes SI economics — a project you can hand to a systems integrator and receive back — expect a version of the same. The TCO for agentic AI needs to price a Forward Deployment motion: fewer accounts per person, longer engagements, higher per-account revenue, product feedback loops that only close months later.</p>

<h2>How to use the map</h2>
<ul>
  <li><strong>Board question:</strong> "Where on the Deployment Model Map is our AI go-to-market today, and where do our vendors' delivery models sit?" If the two quadrants disagree, one of you is going to overrun.</li>
  <li><strong>Pricing question:</strong> Bespoke Services margins fall as you grow because there is no core IP. Forward Deployment margins improve as you grow because the field work feeds primitives back into the product. Which curve is your delivery model actually on?</li>
  <li><strong>Hiring question:</strong> If your account teams are wired as SAs but your workload is a Forward Deployment workload, either move the role or lower your delivery expectations. Both work; pretending is what fails.</li>
</ul>

<div class="callout">
  <div class="callout-t">The one-slide version</div>
  <p><strong>Off-the-Shelf SaaS</strong> scales seats. <strong>Systems Integration</strong> scales SOWs. <strong>Bespoke Services</strong> scales headcount. <strong>Forward Deployment</strong> scales primitives. AI deployments are where the last one lives — and the cost model has to match.</p>
</div>`,

  faqs: [
    ['What is a Forward Deployed Engineer?', 'An engineering role that works alongside customer operations while the product is still defining its category. FDEs uncover requirements by embedding with users, then turn what they find into reusable primitives that become part of the core product. The role exists when both product and workflow have to bend at the same time.'],
    ['Why are AI deployments dragging demand toward Forward Deployment?', 'Because agentic AI defines a new category, so the reference architecture is still being invented; and because the customer\'s workflow does not yet know how it changes with an agent in the loop. Both product and workflow have to bend simultaneously — the exact quadrant an FDE is built for.'],
    ['How is Forward Deployment different from a Solutions Architect model?', 'A Solutions Architect runs a fixed-scope Statement of Work: the product does not bend, only the workflow does. A Forward Deployed Engineer runs an open-scope engagement where both bend, and customer-specific findings feed back into the core product as reusable primitives. SA economics scale SOWs; FDE economics scale primitives.'],
    ['How does this affect AI TCO?', 'If a deployment is priced like Systems Integration but the work is Forward Deployment, scope will overrun, customer-specific learning will not carry back into the product, or the customer will build the missing 30% themselves and unbundle the vendor. Modelling AI TCO honestly requires pricing the delivery motion the work actually needs, not the motion the vendor invoices for.'],
  ],
  cta: `<div class="cta">
  <h2>Model the delivery cost as well as the token cost</h2>
  <p class="cta-sub">The DroidWork TCO calculator prices change-management (J-curve), residual oversight, and process-failure costs alongside tokens — the categories that decide whether an SA-delivered vs. FDE-delivered AI deployment breaks even.</p>
  <a class="btn" href="/calculator/?utm_source=insights&utm_medium=article&utm_campaign=fde-quadrant">Open the Calculator →</a>
  <p style="margin:14px 0 0;font-size:13.5px;color:var(--muted)"><a href="#" data-dw-lead="review_request" data-dw-lead-title="Book a TCO Review">Book a 15-minute intake</a> — we run the model on your deployment.</p>
</div>`,
  related: `<h2>Related</h2>
<div class="rel">
  <a href="/frameworks/">Named frameworks<span>The Agentic Loop Multiplier, the Concurrency Cliff, and more</span></a>
  <a href="/data/">Open dataset<span>132 rows, CSV/JSON, CC BY 4.0 — the citation asset</span></a>
  <a href="/advisory/">Advisory tiers<span>Free calculator, $399 kit, or $5-15k TCO Review</span></a>
  <a href="/insights/">More insights<span>Agentic AI governance and delivery</span></a>
</div>`,
}];

function articlePage(a) {
  const canonical = `${SITE}/insights/${a.slug}/`;
  const includeRefs = a.refs !== false;
  const crumbLabel = a.crumbLabel || a.title.split(':')[0].split(' ').slice(0, 3).join(' ');
  const pill = a.pill || (includeRefs ? 'AI Governance · Research-Backed' : 'AI Delivery · Framework');
  const byline = includeRefs
    ? `By <a href="${AUTHOR_URL}">${esc(AUTHOR)}</a> · Published ${new Date(a.published + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} · ${REFS.length} peer-reviewed sources`
    : `By <a href="${AUTHOR_URL}">${esc(AUTHOR)}</a> · Published ${new Date(a.published + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;

  const article = {
    '@type': 'Article',
    headline: a.title,
    description: a.desc,
    keywords: a.keywords,
    author: { '@type': 'Person', name: AUTHOR, url: AUTHOR_URL },
    publisher: { '@type': 'Organization', name: 'DroidWork.ai', url: SITE },
    mainEntityOfPage: canonical,
    datePublished: a.published,
    dateModified: a.published,
  };
  if (includeRefs) {
    article.citation = REFS.map(([t, url]) => ({
      '@type': 'CreativeWork',
      name: t.replace(/<[^>]+>/g, ''),
      url,
    }));
  }

  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      article,
      {
        '@type': 'FAQPage',
        mainEntity: a.faqs.map(([q, ans]) => ({
          '@type': 'Question', name: q,
          acceptedAnswer: { '@type': 'Answer', text: ans },
        })),
      },
    ],
  };

  const ctaHtml = a.cta || `<div class="cta">
  <h2>What does this cost to build properly?</h2>
  <p class="cta-sub">Constrain, escalate and contain are budget lines, not slideware — scoped credentials,
  behavioural monitoring, kill switches and audit logging. Our TCO model prices them as a first-class cost
  dimension, alongside tokens, hosting and residual oversight.</p>
  <a class="btn" href="/calculator/?utm_source=insights&utm_medium=article&utm_campaign=${esc(a.slug)}">Model the Security Cost →</a>
  <p style="margin:14px 0 0;font-size:13.5px;color:var(--muted)"><a href="#" data-dw-lead="review_request" data-dw-lead-title="Book a TCO Review">Book a 15-minute intake</a> — we run the model on your deployment.</p>
</div>`;

  const refsHtml = includeRefs ? `<h2>References</h2>
<ul class="refs">
${REFS.map(([t, url]) => `  <li>${t} <a href="${url}">${url}</a></li>`).join('\n')}
</ul>
` : '';

  const relHtml = a.related || `<h2>Related</h2>
<div class="rel">
  <a href="/calculator/methodology">The TCO Methodology<span>How the 7 cost dimensions are modelled</span></a>
  <a href="/roles/">All Role Comparisons<span>12 roles, modelled end to end</span></a>
  <a href="/insights/">More Insights<span>Agentic AI governance and cost</span></a>
</div>`;

  const body = `
<div class="crumb"><a href="/">Home</a> › <a href="/insights/">Insights</a> › ${esc(crumbLabel)}</div>
<div class="pill">${esc(pill)}</div>
<h1>${esc(a.title)}</h1>
<p class="lede">${esc(a.dek)}</p>
<div class="byline">${byline}</div>

<div class="art">${a.body}</div>

${ctaHtml}

<h2>Frequently asked</h2>
${a.faqs.map(([q, ans]) => `<div class="faq"><h3>${esc(q)}</h3><p>${esc(ans)}</p></div>`).join('\n')}

${refsHtml}
${relHtml}`;

  return shell({ title: `${a.title} | DroidWork.ai`, desc: a.desc, canonical, jsonld, body });
}

function insightsHub() {
  const body = `
<div class="crumb"><a href="/">Home</a> › Insights</div>
<div class="pill">Insights · Agentic AI Governance</div>
<h1>Insights</h1>
<p class="lede">Research-backed writing on what agentic AI actually costs, and what it actually risks.</p>
<div class="rel" style="grid-template-columns:1fr">
${ARTICLES.map(a => `  <a href="/insights/${a.slug}/">${esc(a.title)}<span>${esc(a.dek)}</span></a>`).join('\n')}
</div>
<div class="cta">
  <h2>Put a number on it</h2>
  <p class="cta-sub">Every governance control described here is a line item. Model the full cost of an agentic
  deployment against the employee it would replace.</p>
  <a class="btn" href="/calculator/?utm_source=insights&utm_medium=hub">Open the Calculator →</a>
</div>`;

  return shell({
    title: 'Insights | DroidWork.ai',
    desc: 'Research-backed analysis of agentic AI governance, security and total cost of ownership.',
    canonical: `${SITE}/insights/`,
    jsonld: {
      '@context': 'https://schema.org', '@type': 'Blog', name: 'DroidWork.ai Insights', url: `${SITE}/insights/`,
    },
    body,
  });
}

// ─── WRITE ───────────────────────────────────────────────────────────────────
mkdirSync(new URL('./insights/', ROOT), { recursive: true });
writeFileSync(new URL('./insights/index.html', ROOT), insightsHub());
console.log('  insights/index.html');
for (const a of ARTICLES) {
  mkdirSync(new URL(`./insights/${a.slug}/`, ROOT), { recursive: true });
  writeFileSync(new URL(`./insights/${a.slug}/index.html`, ROOT), articlePage(a));
  console.log(`  insights/${a.slug}/index.html`);
}

console.log(`\nGenerated ${ARTICLES.length} article(s) + insights hub.`);
