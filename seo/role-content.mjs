/**
 * Per-role editorial content.
 *
 * This exists so the generated pages are NOT thin programmatic spam. Google
 * demotes template pages where only a number changes; LLMs won't cite them at
 * all. Each role below gets a genuine, specific point of view — including the
 * cases where the honest answer is "don't replace this person with AI."
 *
 * That honesty is the product. A CFO who catches you overselling once will
 * never trust the model again.
 */
export const ROLE_CONTENT = {
  swe: {
    h1Role: 'a Software Engineer',
    searchTerm: 'replacing a software engineer with AI',
    angle: 'Coding assistants show the clearest productivity gains of any knowledge role — and the widest gap between demo and production reality.',
    automatable: 'Boilerplate generation, test scaffolding, documentation, code translation, and first-pass review comments. These are genuinely 30–60% faster with a competent assistant.',
    resistant: 'System design, debugging production incidents under time pressure, and judgement calls about technical debt. The work that makes engineers expensive is the work AI helps with least.',
    costDriver: 'Agentic loop multiplier. Coding agents iterate — plan, write, run tests, read the failure, rewrite. That loop is where token spend multiplies 4–10× over a naive estimate.',
    verdict: 'AI reduces the cost per engineer far more reliably than it reduces the number of engineers. Model this as augmentation with a real productivity delta, not headcount removal.',
    faqs: [
      ['Can AI fully replace a software engineer?', 'Not at current capability. AI reliably compresses the routine 40–50% of engineering work, but system design, incident response, and accountability for production systems still require an engineer. The defensible business case is throughput per engineer, not headcount reduction.'],
      ['Why is the AI cost higher than the token estimate I was quoted?', 'Because coding is agentic. A single task triggers multiple plan-execute-observe loops, each re-consuming a growing context window. Vendor quotes price one API call; real usage bills for the whole loop.'],
      ['What is the most commonly missed cost?', 'Human review time. Generated code still needs an engineer to read, verify, and own it. That residual oversight labour is a real line item and it does not disappear as models improve — it shifts.'],
    ],
  },
  ds: {
    h1Role: 'a Data Scientist',
    searchTerm: 'replacing a data scientist with AI',
    angle: 'Data science is the role where AI most convincingly produces output that looks right and is subtly wrong.',
    automatable: 'Exploratory analysis, feature engineering suggestions, boilerplate modelling code, and drafting the narrative around results.',
    resistant: 'Problem framing, selecting the right target variable, recognising leakage, and knowing when a result is too good to be true. Judgement about data quality is the job.',
    costDriver: 'Data pipeline tax plus silent failure risk. Every model needs current data, and a plausible-but-wrong analysis propagates downstream before anyone catches it.',
    verdict: 'Among the weakest replacement cases. AI accelerates a competent data scientist substantially but produces expensive errors without one supervising.',
    faqs: [
      ['Is AI cheaper than hiring a data scientist?', 'Rarely at current pricing, once you include the data pipeline and re-embedding costs that keep the system current. The savings in our model are narrow for this role — and narrow savings do not justify execution risk.'],
      ['What is the silent failure risk for analytics?', 'An AI analysis that is confidently wrong produces no error. It flows into a dashboard, then a decision. Detection typically happens only when a downstream result looks anomalous — often weeks later.'],
      ['Where does AI genuinely help here?', 'Speed of exploration. Hypotheses that took a day to test take an hour. That compounds — but only with someone qualified deciding which hypotheses are worth testing.'],
    ],
  },
  pm: {
    h1Role: 'a Product Manager',
    searchTerm: 'replacing a product manager with AI',
    angle: 'Product management shows one of the largest modelled savings — and is one of the least suitable roles for actual replacement.',
    automatable: 'Drafting specs, summarising user feedback at volume, competitive research, and writing release notes.',
    resistant: 'Prioritisation under organisational conflict, stakeholder negotiation, and deciding what NOT to build. PM value is political and contextual, not textual.',
    costDriver: 'Residual human oversight. Nearly every AI-produced product artefact still requires a human to own it in a room full of stakeholders.',
    verdict: 'Treat a large modelled saving here with suspicion. The output is easy to automate; the accountability is not. Use this as an augmentation case.',
    faqs: [
      ['Why does the calculator show high savings for product managers?', 'Because PM output is largely documents, and document generation is cheap. The model prices the artefacts, not the organisational authority required to make them stick. This is exactly why you should read the residual oversight line carefully.'],
      ['What part of product management is safest from automation?', 'Saying no. Prioritisation requires absorbing political cost, which requires a person who can be held responsible.'],
      ['How should I actually use AI in product?', 'Compress research and drafting so PMs spend their time on stakeholder work. Model it as capacity gained rather than salary removed.'],
    ],
  },
  finance: {
    h1Role: 'a Financial Analyst',
    searchTerm: 'replacing a financial analyst with AI',
    angle: 'High automation potential collides directly with the highest accuracy and auditability requirements in the business.',
    automatable: 'Variance analysis, report generation, reconciliation first passes, and narrative commentary on results.',
    resistant: 'Anything requiring a signature. Controls, auditability, and regulatory defensibility demand traceable human judgement.',
    costDriver: 'Security, compliance, and process failure costs. Finance data is the most sensitive in the company, and an error carries regulatory weight, not just rework.',
    verdict: 'Strong augmentation case, weak replacement case. The compliance overhead of autonomous finance agents consumes much of the modelled saving.',
    faqs: [
      ['Can AI replace financial analysts?', 'It can replace much of the preparation work, not the accountability. Controls frameworks require a named human who can defend a number to an auditor. Model AI here as analyst capacity, not analyst headcount.'],
      ['What compliance costs should I include?', 'Audit logging, access controls, data loss prevention, and retention of the reasoning behind AI-generated figures. These are budget lines most vendor ROI models omit entirely.'],
      ['Does this apply to regulated industries?', 'The costs rise sharply. In financial services and healthcare, add model governance and explainability requirements on top of standard controls.'],
    ],
  },
  hr: {
    h1Role: 'an HR Generalist',
    searchTerm: 'replacing an HR generalist with AI',
    angle: 'One of the clearest cases in the model where AI costs MORE than the employee it would replace.',
    automatable: 'Policy question answering, benefits FAQs, scheduling, and first-pass resume screening.',
    resistant: 'Investigations, terminations, accommodation decisions, and anything where an employee needs to trust the person across the table.',
    costDriver: 'Security and compliance. HR systems hold the most legally sensitive personal data in the organisation, and employment decisions carry direct discrimination liability.',
    verdict: 'Our model shows negative savings at a typical salary. The compliance and oversight burden exceeds the modest labour saving. This is a deliberately unglamorous result — and an honest one.',
    faqs: [
      ['Why does AI cost more than an HR generalist?', 'HR salaries sit below the threshold where AI infrastructure, security, and compliance overhead pay for themselves. The fixed costs of a compliant deployment do not scale down to match a moderately paid role.'],
      ['Is any HR work worth automating?', 'Yes — high-volume, low-risk queries like benefits and policy lookups. Automate the query desk, not the judgement.'],
      ['What is the biggest legal exposure?', 'Automated screening and employment decisions. Several jurisdictions now require bias auditing and candidate notification for automated employment decision tools, which is a recurring cost.'],
    ],
  },
  ops: {
    h1Role: 'an Operations Analyst',
    searchTerm: 'replacing an operations analyst with AI',
    angle: 'Effectively cost-neutral in our model — which makes execution risk the deciding factor, not price.',
    automatable: 'Demand forecasting inputs, exception reporting, routine supplier communications, and dashboard commentary.',
    resistant: 'Supplier negotiation, crisis response when a shipment fails, and the relationship knowledge that resolves problems informally.',
    costDriver: 'Process failure and rework. Operations errors propagate into the physical world, where correction is expensive and slow.',
    verdict: 'When savings are near zero, the rational decision is to keep the human and use AI to extend their reach. You do not take deployment risk for a rounding error.',
    faqs: [
      ['Should I automate operations analysis?', 'Not for cost reasons at typical salaries — our model shows roughly break-even. Automate it for speed and coverage if those have independent value.'],
      ['What makes operations failures expensive?', 'They leave the software. A wrong reorder quantity becomes real inventory, real freight, and real write-offs, so rework cost far exceeds the token cost that caused it.'],
      ['How do I reduce the risk?', 'Keep AI in an advisory position with human approval on anything that triggers a physical or financial commitment.'],
    ],
  },
  marketing: {
    h1Role: 'a Marketing Manager',
    searchTerm: 'replacing a marketing manager with AI',
    angle: 'Content volume is nearly free now. Judgement about what to say, and brand risk when it goes wrong, is not.',
    automatable: 'Copy variants, campaign briefs, SEO drafts, social scheduling, and performance summaries.',
    resistant: 'Positioning, brand voice, budget allocation, and crisis judgement. Knowing which message matters is the job.',
    costDriver: 'Process failure and brand risk. A bad campaign is public and durable, and reputational damage has no clean line item.',
    verdict: 'Modest savings with a real augmentation upside. The win is more experiments per quarter, not a smaller marketing team.',
    faqs: [
      ['Can AI replace a marketing manager?', 'It replaces a meaningful share of production work, not the strategic allocation of budget and attention. Modelled savings are moderate and mostly reflect content production.'],
      ['What about AI-generated content and search rankings?', 'Search engines reward useful, original content regardless of how it was produced, and demote thin templated output. Volume without substance is a cost, not a saving.'],
      ['What is the hidden risk?', 'Brand voice drift across many generated assets, which erodes distinctiveness slowly enough that nobody catches it in a single review cycle.'],
    ],
  },
  sales: {
    h1Role: 'a Sales Representative',
    searchTerm: 'replacing a sales representative with AI',
    angle: 'AI compresses the administrative half of selling. The half that closes revenue remains stubbornly human.',
    automatable: 'Prospect research, outreach drafting, CRM hygiene, call summaries, and follow-up sequencing.',
    resistant: 'Trust building, objection handling, negotiation, and reading a room. Enterprise buyers purchase from people.',
    costDriver: 'Process failure and pipeline risk, plus residual oversight. A misfired outreach sequence can damage accounts faster than it builds them.',
    verdict: 'Solid augmentation economics. Reps sell more because they administer less — quota capacity per rep is the metric to model, not rep count.',
    faqs: [
      ['Does AI replace SDRs?', 'It replaces much of the research and drafting, which is why teams get more coverage per rep. Fully automated outreach at volume tends to depress reply rates and burn domain reputation.'],
      ['What should I model for a sales team?', 'Quota capacity per rep rather than headcount reduction. If AI returns six hours a week to selling, price that against quota attainment.'],
      ['What is the risk of autonomous outreach?', 'Deliverability and brand damage. Volume without targeting gets domains flagged, which is expensive and slow to reverse.'],
    ],
  },
  legal: {
    h1Role: 'Legal Counsel',
    searchTerm: 'replacing legal counsel with AI',
    angle: 'High salary makes the arithmetic attractive. Professional liability makes the deployment narrow.',
    automatable: 'Contract review first passes, clause extraction, precedent research, and standard document drafting.',
    resistant: 'Legal advice, privilege, risk judgement, and anything a regulator or court expects a licensed human to stand behind.',
    costDriver: 'Security, compliance, and silent failure. A missed indemnity clause surfaces during a dispute — years later, at maximum cost.',
    verdict: 'Genuine savings driven by salary, but cap the scope at review assistance. Hallucinated citations have already produced court sanctions.',
    faqs: [
      ['Can AI replace a lawyer?', 'No. Unauthorised practice of law rules and professional liability require a licensed human. AI accelerates review and research under supervision.'],
      ['Why do legal roles show meaningful savings?', 'Because the salary baseline is high relative to AI infrastructure cost. Savings scale with salary, which is why senior roles model better than junior ones.'],
      ['What is the biggest documented failure mode?', 'Fabricated case citations. Multiple jurisdictions have sanctioned filings containing AI-invented precedent, making verification a mandatory, non-optional cost.'],
    ],
  },
  cs: {
    h1Role: 'a Customer Support Agent',
    searchTerm: 'replacing a customer support agent with AI',
    angle: 'The most deployed AI use case in the enterprise — and one of the thinnest margins in our model.',
    automatable: 'Tier-1 tickets, order status, password resets, returns, and FAQ deflection at high volume.',
    resistant: 'Escalations, angry customers, ambiguous edge cases, and retention conversations where a human matters commercially.',
    costDriver: 'Concurrency. Support is bursty, and above roughly 50 concurrent sessions, per-token pricing gives way to provisioned throughput with thousands per month in fixed cost.',
    verdict: 'Savings are real but thin per agent, and they depend entirely on deflection rate. Below roughly 60% deflection the economics invert.',
    faqs: [
      ['How much does AI customer support actually save?', 'Less than vendors suggest at a single-agent level. Our model shows a narrow margin, because deflection is rarely as high in production as in a demo, and escalations still require staffed humans.'],
      ['What is the concurrency cliff?', 'Below roughly 50 concurrent users, per-token pricing works. Above it, providers push provisioned throughput — a fixed monthly commitment that applies whether or not you use it.'],
      ['When does support automation clearly pay off?', 'At high ticket volume with genuinely repetitive queries. The economics improve with scale, not with salary.'],
    ],
  },
  it: {
    h1Role: 'an IT Support Specialist',
    searchTerm: 'replacing an IT support specialist with AI',
    angle: 'Well suited to automation on paper, but the role holds privileged access — which changes the security maths entirely.',
    automatable: 'Password resets, access requests, provisioning, routine troubleshooting, and knowledge base answers.',
    resistant: 'Physical hardware, novel failures, and any incident requiring privileged judgement about what to shut down.',
    costDriver: 'Security posture. An agent with IT-level permissions is a standing privilege escalation risk requiring secrets management, kill switches, and behavioural monitoring.',
    verdict: 'Moderate savings, conditional on strict permission scoping. Give an agent admin rights to save time and you will spend the saving on security.',
    faqs: [
      ['Can AI handle IT support?', 'It handles the high-volume request desk well. Give it privileged system access and the security controls required will consume much of the modelled saving.'],
      ['What security controls are required?', 'Scoped short-lived credentials, network microsegmentation, behavioural anomaly detection, kill switches, and full audit logging. These are recurring costs.'],
      ['Why do agents need special controls?', 'Because when blocked, autonomous agents explore alternative permission paths to complete a task. Traditional IT controls assume a human who simply stops.'],
    ],
  },
  strategy: {
    h1Role: 'a Strategy Consultant',
    searchTerm: 'replacing a strategy consultant with AI',
    angle: 'AI produces a credible-looking deck in minutes. Whether anyone acts on it is a different question.',
    automatable: 'Market research, competitive scans, financial modelling drafts, and slide production.',
    resistant: 'Executive persuasion, organisational diagnosis, and the political work of getting a recommendation adopted.',
    costDriver: 'Silent failure plus residual oversight. A strategy built on a plausible but wrong premise is expensive and slow to detect.',
    verdict: 'Meaningful modelled savings from a high salary base, but the deliverable is not the value — adoption is. Model this as research acceleration.',
    faqs: [
      ['Can AI replace management consultants?', 'It replaces a large share of the research and production work. It does not replace the credibility and organisational pressure that make a recommendation actionable.'],
      ['Why do savings look high here?', 'High salaries and highly automatable artefacts. Read this number alongside the residual oversight line before treating it as headcount savings.'],
      ['What is the risk?', 'Confident synthesis of shallow research. AI rarely signals when a market analysis rests on thin or outdated sourcing.'],
    ],
  },
};
