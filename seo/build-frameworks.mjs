/**
 * /frameworks/<slug>/ — three named, citable concepts.
 *
 * Why named concepts: LLMs cite named things. "The Agentic Loop Multiplier"
 * is quotable in a way "the thing where tokens explode" is not. Each page
 * carries DefinedTerm + Article schema so the definition is machine-readable
 * and the page can be surfaced as an authoritative source.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { shell, esc, SITE, YEAR } from './shell.mjs';

const ROOT = new URL('../', import.meta.url);
const OUT = new URL('./frameworks/', ROOT);
mkdirSync(OUT, { recursive: true });

const roles = JSON.parse(readFileSync(new URL('./role-data.json', import.meta.url), 'utf8'));
const AUTHOR = 'Karthik Balachandran';
const AUTHOR_URL = 'https://www.linkedin.com/in/kbalachandran';

const FRAMEWORKS = [
  {
    slug: 'the-agentic-loop-multiplier',
    term: 'The Agentic Loop Multiplier',
    dek: 'Every "task" in a ReAct-style agent is not one API call. It is 4–10 — and each iteration bills against a growing context. Standard token calculators miss this by a factor of 4×–10×.',
    definition: 'The Agentic Loop Multiplier is the factor by which real per-task token consumption exceeds naive single-call estimates in an agent framework — 4×–10× in typical ReAct or tool-use deployments, driven by plan/act/observe/reflect iterations and by context growth as prior reasoning is appended to the scratchpad on every step.',
    theNumber: '4×–10×',
    theNumberSub: 'per-task token consumption in an agentic loop, vs. a naive single API call.',
    keywords: 'agentic AI cost, ReAct token consumption, agent loop tokens, agentic AI TCO, tool-use API cost, agent scratchpad cost',
    body: `
<h2>The definition</h2>
<p>A single "task" in a ReAct-style agent framework is not one API call. It is a structured loop: <strong>plan, use tool, observe, reflect, act again</strong>. Each iteration is a billable API call with its own input context — which <em>grows at every step</em> as the agent appends its prior reasoning to the scratchpad. This is the Agentic Loop Multiplier.</p>

<blockquote>Standard token calculators assume a 1:1 relationship between user tasks and API calls. In agentic deployments this assumption is false by a factor of 4× to 10×.</blockquote>

<h2>Why it costs money</h2>
<p>Three compounding effects, all invisible in a naive tokens × tasks estimate:</p>
<ul>
  <li><strong>Iteration count.</strong> Each ReAct loop turn is a billed call. Complex tasks routinely take 4–10 turns. Multiply by hundreds of thousands of annual tasks and the API bill stops looking like the friendly demo.</li>
  <li><strong>Context growth per turn.</strong> The input context to each turn includes the running scratchpad — prior reasoning, tool outputs, observations. Input tokens per call grow monotonically inside a single task.</li>
  <li><strong>Abandonment tax.</strong> Tau-bench (2024) measured 12–22% task abandonment across state-of-the-art agents. Abandoned tasks still burn roughly half their token budget before failing. You pay for the failure.</li>
</ul>

<h2>The number</h2>
<p>Applied consistently to a mid-level knowledge-worker deployment (250 daily tasks per user, GPT-4o class model, five-turn loop):</p>
<ul>
  <li>Naive estimate: ~$28,000/yr in tokens</li>
  <li>Modelled with loop + abandonment: ~$110,000–$180,000/yr</li>
  <li>Multiplier: <strong>4×–6×</strong> on the vendor slide</li>
</ul>
<p>Longer-horizon agents (research, code, ops) push the multiplier toward the 10× end of the range. The full derivation, including the abandonment-cost formula and its Tau-bench sourcing, is in the <a href="/calculator/methodology#s4">methodology, Module 2B</a>.</p>

<h2>How to check it on your own deployment</h2>
<ul>
  <li>Instrument agent traces to record iterations-per-task and mean input tokens per iteration.</li>
  <li>Compute mean iterations × mean input tokens per iteration × input price + mean output per iteration × output price.</li>
  <li>Compare against the naive "prompt tokens × completions × price" line in the vendor deck.</li>
  <li>The gap is the loop multiplier. If it is under 3×, you are either running short-horizon single-call tasks or your traces are undercounting.</li>
</ul>

<h2>Why this framework is worth naming</h2>
<p>Because giving the effect a name lets a CFO push back on a slide that shows only base token cost. "What is your agentic loop multiplier?" is a specific, answerable, budget-relevant question. "Is this token estimate realistic?" is not.</p>`,
    faqs: [
      ['What is the agentic loop multiplier?', 'The factor by which per-task token consumption in a ReAct-style agent exceeds a naive single-call estimate. Typically 4× to 10×, driven by plan/act/observe/reflect iterations and by context growth as prior reasoning accumulates in the scratchpad.'],
      ['Why is token cost 4× to 10× higher in agentic deployments?', 'Because a single user task triggers several API calls — one per loop iteration — and each successive call carries a longer input context that includes the prior reasoning and tool outputs. Abandoned tasks consume roughly half their token budget before failing, which adds an additional cost layer.'],
      ['Where does the 4× to 10× range come from?', 'It is derived from combining measured iteration counts in production agents (typically 4–8 turns for complex tasks) with the empirical 12–22% abandonment rate measured in Tau-bench (2024) across state-of-the-art LLM agents.'],
      ['How do I test this on my own deployment?', 'Instrument agent traces to capture iterations per task and mean input tokens per iteration, then compare the resulting cost against a naive "tasks × completion tokens × price" estimate. The gap is the multiplier for your workload.'],
    ],
    seeAlso: [
      ['/frameworks/the-concurrency-cliff/', 'The Concurrency Cliff', 'The other line every vendor deck omits'],
      ['/calculator/methodology#s4', 'Methodology · Module 2B', 'Full derivation and formula'],
    ],
  },

  {
    slug: 'the-concurrency-cliff',
    term: 'The Concurrency Cliff',
    dek: 'At ~50 concurrent users, agentic AI cost transitions from variable (pay-per-token) to semi-fixed (provisioned throughput). $2–6k/month appears before any per-token cost.',
    definition: 'The Concurrency Cliff is the point in a cloud AI deployment — approximately 50 concurrent users for GPT-4o class models — at which pay-per-token pricing is no longer feasible and Provisioned Throughput Units, dedicated inference endpoints or reserved capacity are required. Cost structure shifts from fully variable to semi-fixed, adding $2,000–$6,000 per month before any tokens are consumed.',
    theNumber: '~50',
    theNumberSub: 'concurrent users. Above this threshold, provisioned throughput adds $2–6k/month in fixed cost.',
    keywords: 'AI concurrency, Provisioned Throughput Units, PTU pricing, agentic AI infrastructure, Azure OpenAI PTU, dedicated inference, AI rate limits',
    body: `
<h2>The definition</h2>
<p>Concurrent users are not the same as total volume. A system with 5 concurrent users processing 200 tasks a day is a fundamentally different beast from a system with 50 concurrent users processing 200 tasks a day — even though total token volume is similar. The Concurrency Cliff is the transition point.</p>

<blockquote>Below ~50 concurrent users you rent capacity by the token. Above it, you rent capacity by the month. This shifts the cost structure from variable to semi-fixed.</blockquote>

<h2>The three regimes</h2>
<div class="tri">
  <div class="tri-c"><h3>Regime 1 · &lt; 10 concurrent</h3><p>Standard API pricing. Pay-per-token, spiky, no reserved capacity. Latency is fine, rate limits are not felt. This is where most pilots live.</p></div>
  <div class="tri-c"><h3>Regime 2 · 10–49 concurrent</h3><p>Rate-limit engineering. Request queuing, exponential backoff, higher API tiers. This model adds a ~15% premium on token cost to reflect the tier upgrade. Latency SLAs start to bite.</p></div>
  <div class="tri-c"><h3>Regime 3 · 50+ concurrent</h3><p>Provisioned throughput required. Azure PTUs, AWS Bedrock Reserved Capacity, or dedicated inference endpoints. Semi-fixed cost. Standard API tiers no longer feasible for the load.</p></div>
</div>

<h2>Why it costs money</h2>
<p>Azure OpenAI Provisioned Throughput Unit pricing (2024) requires roughly <strong>200 PTUs for 50 concurrent GPT-4o users</strong>. At $3,000 per 100 PTUs per month, that is <strong>$6,000/month or $72,000/year</strong> in committed capacity — before you consume a single token, and independent of daily task volume.</p>

<p>For smaller GPT-4o-mini or Sonnet-class deployments the number is closer to $2,000–$3,000 per month for the same concurrency. Either way, it is a fixed line item that does not appear on the vendor's per-token slide.</p>

<h2>The trap for planners</h2>
<p>Concurrency scales with adoption, not with volume. A tool used lightly by 200 people can easily hit 50 concurrent during the morning hour. Deployment plans that scale token cost linearly with headcount miss this — because the cliff is discrete, not gradual.</p>

<p>This is the second-largest source of understatement in vendor calculators, after the Agentic Loop Multiplier. Two named effects, two silent orders of magnitude.</p>

<h2>How to check it on your own deployment</h2>
<ul>
  <li>Estimate <strong>peak-hour</strong> concurrent users, not average. Adoption is bursty.</li>
  <li>If peak exceeds ~50, price provisioned throughput separately from token cost.</li>
  <li>Do not spread the PTU cost per user — model it as fixed until the next capacity increment.</li>
  <li>Full formulas: <a href="/calculator/methodology#s5">methodology, Module 2C</a>.</li>
</ul>`,
    faqs: [
      ['What is the concurrency cliff in AI deployments?', 'The point — around 50 concurrent users for GPT-4o class models — at which pay-per-token API pricing becomes infeasible and Provisioned Throughput Units or dedicated inference endpoints are required. It shifts the cost structure from fully variable to semi-fixed and typically adds $2,000-$6,000 per month in committed capacity.'],
      ['Why does concurrency add cost separately from token volume?', 'Because concurrency and token volume scale independently. A system with high concurrency but modest total volume still exceeds standard API rate limits and requires reserved capacity, which is priced by throughput unit rather than by token.'],
      ['How much do Azure OpenAI PTUs cost for 50 concurrent users?', 'Roughly 200 PTUs at $2,000-$4,000 per 100 PTUs per month per Azure OpenAI documentation (2024), which is $4,000-$8,000 per month or $48,000-$96,000 per year. Actual pricing depends on model class and reservation term.'],
      ['At what user count do I need provisioned throughput?', 'Approximately 50 concurrent users for GPT-4o class deployments, though the exact threshold depends on the API tier, request latency requirements, and average tokens per request. Peak concurrency matters, not average.'],
    ],
    seeAlso: [
      ['/frameworks/the-agentic-loop-multiplier/', 'The Agentic Loop Multiplier', 'The other invisible 5×'],
      ['/calculator/methodology#s5', 'Methodology · Module 2C', 'Full derivation with PTU tables'],
    ],
  },

  {
    slug: 'constrain-escalate-contain',
    term: 'Constrain, Escalate, Contain',
    dek: 'The alternative to "human in the loop". Three layers that assume the fallible component fails — because after two decades of research, we know that "the fallible component" is the human.',
    definition: 'Constrain, Escalate, Contain is a three-layer safety pattern for AI agents that replaces reliance on human-in-the-loop approval with (1) least-privilege runtime controls that constrain what an agent can do by default, (2) exception-based escalation that routes only rare, consequential, hard-to-undo decisions to humans, and (3) containment mechanisms — detection, circuit breakers, kill switches — that limit blast radius when the other two layers fail.',
    theNumber: '73% → 62%',
    theNumberSub: 'clinician diagnostic accuracy under biased AI assistance (JAMA 2023, n=457). The reason HITL is not the answer.',
    keywords: 'AI agent governance, constrain escalate contain, HITL alternative, agentic AI safety, AI zero trust, agent runtime policy, AI containment',
    body: `
<h2>The definition</h2>
<p>Constrain, Escalate, Contain is what you build when you have taken the human-factors research seriously and stopped pretending "human in the loop" is a control. Three layers, each with a specific job:</p>

<div class="tri">
  <div class="tri-c"><h3>Constrain by default</h3><p>Decide what the agent <em>cannot</em> do before it runs. Least-privilege credentials, scoped access, policy checks that block prohibited actions at pre-check and at runtime. Most important for irreversible operations: deleting data, exfiltrating it, lateral access to crown jewels.</p></div>
  <div class="tri-c"><h3>Escalate by exception</h3><p>Save human approval for the rare, consequential, hard-to-undo decisions — and give the person real context and real authority to say no. A reviewer who sees three meaningful decisions a week is a judge. A reviewer who sees three hundred is a clicker.</p></div>
  <div class="tri-c"><h3>Contain on failure</h3><p>Something will get through. Detection that flags abnormal behaviour, circuit breakers that halt on defined conditions, kill switches that revoke credentials in seconds. Fast reaction to a rare alarm is the one job humans are actually built for.</p></div>
</div>

<h2>Why it costs money (and why HITL costs more)</h2>
<p>Naive HITL looks free — you already pay the reviewer's salary. What it actually costs is invisible until an incident: the false sense of control, the compliance signature that does not correspond to review, and the crumple-zone dynamic where the reviewer absorbs the blame for a system failure. The <a href="/insights/human-in-the-loop-will-not-protect-your-ai-agents/">underlying essay</a> walks the research: JAMA (2023) shows clinician accuracy dropping from 73% to 62% under biased AI assistance; the CHI 2025 study on knowledge workers shows critical thinking declining as AI trust rises; JMIS (2016) shows warning habituation degrading with each additional approval prompt.</p>

<p>Constrain, Escalate, Contain has a real budget line — scoped credentials, runtime policy, behavioural monitoring, kill switches, audit — but it is a budget line, not slideware. The DroidWork model prices it in the <em>Security &amp; compliance</em> dimension. It is the difference between a governance claim and a governance implementation.</p>

<h2>The pattern in one sentence</h2>
<blockquote>Use people where judgement is scarce and the stakes are high. Use infrastructure where enforcement has to be constant, fast and complete. Build it so neither one has to be perfect.</blockquote>

<h2>Where each layer lives in your stack</h2>
<ul>
  <li><strong>Constrain</strong> — IAM, scoped tokens, tool allowlists, request-time policy engines (OPA, Cedar), network segmentation.</li>
  <li><strong>Escalate</strong> — approval routing that fires <em>only</em> on defined risk conditions; escalation queues that batch peers together for context.</li>
  <li><strong>Contain</strong> — anomaly detection on agent behaviour, circuit breakers on rate/scope/action, kill switch bound to credential revocation.</li>
</ul>

<p>None of these are novel primitives. What is novel is the discipline of using them <em>instead of</em> — not in addition to — a human-in-the-loop signature line.</p>`,
    faqs: [
      ['What is Constrain, Escalate, Contain?', 'A three-layer safety pattern for AI agents: constrain what the agent can do by default with least-privilege runtime controls, escalate only rare and consequential decisions to a human with real authority, and contain failures with detection, circuit breakers and kill switches. It is the alternative to relying on human-in-the-loop approval as a safeguard.'],
      ['Why is Constrain, Escalate, Contain preferred over human-in-the-loop?', 'Because two decades of human-factors research show that humans reviewing a system that is right most of the time habituate to the "approve" button. A JAMA 2023 study showed clinician accuracy dropped from 73% to 62% under biased AI assistance. Constrain, Escalate, Contain assumes the fallible component (the human) fails and designs around it.'],
      ['What is "constrain" in practice?', 'Least-privilege credentials, scoped tool access, and policy checks that block prohibited actions before and during agent execution. Implemented via IAM, request-time policy engines like OPA or Cedar, and network segmentation.'],
      ['What is "contain" in practice?', 'Anomaly detection on agent behaviour, circuit breakers that halt execution on defined conditions, and a kill switch that revokes credentials in seconds. This is where humans genuinely add value — reacting hard to a rare alarm.'],
    ],
    seeAlso: [
      ['/insights/human-in-the-loop-will-not-protect-your-ai-agents/', 'HITL will not protect your AI agents', 'The essay this framework comes from'],
      ['/frameworks/the-agentic-loop-multiplier/', 'The Agentic Loop Multiplier', 'A named cost effect worth citing'],
    ],
  },
];

function frameworkPage(f) {
  const canonical = `${SITE}/frameworks/${f.slug}/`;
  const today = new Date().toISOString().slice(0, 10);

  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'DefinedTerm',
        '@id': canonical + '#term',
        name: f.term,
        description: f.definition,
        inDefinedTermSet: {
          '@type': 'DefinedTermSet',
          name: 'The DroidWork AI TCO Framework Glossary',
          url: `${SITE}/frameworks/`,
        },
        url: canonical,
      },
      {
        '@type': 'Article',
        headline: f.term,
        description: f.dek,
        keywords: f.keywords,
        author: { '@type': 'Person', name: AUTHOR, url: AUTHOR_URL },
        publisher: { '@type': 'Organization', name: 'DroidWork.ai', url: SITE },
        mainEntityOfPage: canonical,
        datePublished: today,
        dateModified: today,
        about: { '@id': canonical + '#term' },
      },
      {
        '@type': 'FAQPage',
        mainEntity: f.faqs.map(([q, a]) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ],
  };

  const body = `
<div class="crumb"><a href="/">Home</a> › <a href="/frameworks/">Frameworks</a> › ${esc(f.term)}</div>
<div class="pill">Framework · Cite this</div>
<h1>${esc(f.term)}</h1>
<p class="lede">${esc(f.dek)}</p>
<div class="byline">By <a href="${AUTHOR_URL}">${esc(AUTHOR)}</a> · Part of the DroidWork AI TCO Framework</div>

<div class="callout">
  <div class="callout-t">The number</div>
  <p><strong style="font-size:24px;color:var(--white)">${esc(f.theNumber)}</strong> — ${esc(f.theNumberSub)}</p>
</div>

<div class="art">
${f.body}
</div>

<div class="cta">
  <h2>Model this on your deployment</h2>
  <p class="cta-sub">This framework is baked into the DroidWork TCO calculator. Adjust the inputs — the numbers move accordingly.</p>
  <a class="btn" href="/calculator/?utm_source=frameworks&utm_medium=article&utm_campaign=${esc(f.slug)}">Open the Calculator →</a>
</div>

<h2>Frequently asked</h2>
${f.faqs.map(([q, a]) => `<div class="faq"><h3>${esc(q)}</h3><p>${esc(a)}</p></div>`).join('\n')}

<h2>See also</h2>
<div class="rel">
${f.seeAlso.map(([href, t, sub]) => `  <a href="${href}">${esc(t)}<span>${esc(sub)}</span></a>`).join('\n')}
  <a href="/frameworks/">All frameworks<span>The full glossary</span></a>
</div>

<p class="disc">This framework is documented as part of the open-source <a href="https://github.com/karthika2z/ai-tco-framework">DroidWork AI TCO Framework</a>. Cite it as: DroidWork.ai (${YEAR}). "${esc(f.term)}." ${canonical}</p>`;

  return shell({
    title: `${f.term} — Definition, Number, Why It Costs Money | DroidWork.ai`,
    desc: f.definition,
    canonical,
    jsonld,
    body,
  });
}

function hubPage() {
  const canonical = `${SITE}/frameworks/`;
  const body = `
<div class="crumb"><a href="/">Home</a> › Frameworks</div>
<div class="pill">Named Concepts · Cite This</div>
<h1>The AI TCO Framework Glossary</h1>
<p class="lede">Named, defensible concepts from the DroidWork TCO model. Each entry: definition, why it costs money, the number, sources — and a live calculator you can rerun.</p>

<div class="rel" style="grid-template-columns:1fr;gap:12px">
${FRAMEWORKS.map(f => `  <a href="/frameworks/${f.slug}/">${esc(f.term)}<span>${esc(f.dek)}</span></a>`).join('\n')}
</div>

<div class="cta">
  <h2>These frameworks are baked into the model</h2>
  <p class="cta-sub">Every calculation on this site applies the multipliers described above. Open the model and change the inputs to see what they do to your case.</p>
  <a class="btn" href="/calculator/?utm_source=frameworks&utm_medium=hub">Open the Calculator →</a>
</div>`;

  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name: 'The DroidWork AI TCO Framework Glossary',
    url: canonical,
    hasDefinedTerm: FRAMEWORKS.map(f => ({
      '@type': 'DefinedTerm',
      name: f.term,
      description: f.definition,
      url: `${SITE}/frameworks/${f.slug}/`,
    })),
  };

  return shell({
    title: 'AI TCO Framework Glossary — Named, Citable Concepts | DroidWork.ai',
    desc: 'Named concepts from the DroidWork AI TCO model: the Agentic Loop Multiplier, the Concurrency Cliff, and Constrain-Escalate-Contain. Each with definition, number, sources.',
    canonical,
    jsonld,
    body,
  });
}

writeFileSync(new URL('./index.html', OUT), hubPage());
console.log('  frameworks/index.html');

for (const f of FRAMEWORKS) {
  const dir = new URL(`./${f.slug}/`, OUT);
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL('index.html', dir), frameworkPage(f));
  console.log(`  frameworks/${f.slug}/index.html`);
}

export { FRAMEWORKS };
