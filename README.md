# AI TCO Framework

**The open-source methodology for calculating the true total cost of AI vs. employees.**

Most vendor ROI calculators show you token costs. That's ~20% of the real picture. This framework surfaces the other 80% — so executives, CFOs, and engineering leaders make decisions with the full cost in view.

[![Live Calculator](https://img.shields.io/badge/Live%20Calculator-droidwork.ai-0f2042?style=flat-square)](https://droidwork.ai/calculator)
[![Methodology](https://img.shields.io/badge/Methodology-Read%20the%20Docs-059669?style=flat-square)](https://droidwork.ai/calculator/methodology)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

---

## The Core Insight

Vendors quote **token/compute cost**. Real AI deployment TCO looks like this:

| Cost Category | Typical Share of TCO |
|---|---|
| Token / Compute | ~20% |
| Agentic Loop Multiplier | 15–25% |
| Infrastructure & Data Pipelines | 15–20% |
| Security & Compliance | 10–15% |
| Process Failure & Quality Costs | 10–15% |
| Human Oversight (residual labor) | 10–20% |
| J-Curve / Change Management | 5–10% |

A single agentic task isn't one API call. Agents plan, observe, and reflect — triggering 4–8 API roundtrips that multiply token spend **4–10×**. None of this appears in vendor quotes.

---

## The 7-Module Methodology

### Module 0 — Employee Profile
True employee cost baseline: base salary × burden rate (benefits, payroll taxes, equity, facilities, management overhead). Sources: BLS OES 2024, Mercer, Radford/Aon. Covers 12 job functions × 11 levels (Intern → C-Suite).

### Module 1 — Employee True Cost
- Salary burden (benefits, FICA, equity, PTO, facilities): typically **1.25–1.45×** base
- Tasks/day and task completion rate normalization
- Output: annualized employee true cost per role

### Module 2 — Cloud AI Token Cost + Agentic Loop Multiplier
- Base token cost (input + output per task × annual volume)
- **Agentic loop multiplier**: each loop iteration re-consumes growing context (`ctx_growth` factor, default 3.5×)
- Tool call output tokens accumulate each loop
- Abandonment rate: failed tasks still burn ~50% of token budget
- Concurrency cliff: above ~50 concurrent users, provisioned throughput (PTU) replaces per-token billing

### Module 3 — Infrastructure & Data Pipelines
- Vector DB / RAG infrastructure (Pinecone, Weaviate, pgvector)
- Streaming data pipelines and ETL
- Model hosting (self-hosted vs. API)
- Monitoring & observability (LLM-specific: token latency, hallucination detection)

### Module 4 — Security & Compliance
Agentic AI expands the attack surface beyond standard IT budgets:
- **Network microsegmentation** + kill switches (agents explore permission combinations when blocked)
- **Behavioral anomaly detection** (adaptive loops behave differently than rule-based automation)
- **Dynamic secrets management** (agents accumulate credentials across sessions)
- **Skill supply chain auditing** (plain-text skills bypass standard CI/CD scanners)
- DLP, IAM, audit logging for regulated industries
- Grounded in: NIST SP 800-204, MITRE ATLAS 2023, OWASP LLM Top 10

### Module 5 — Process Failure & Quality Costs
- Hallucination/error rate × downstream cost per failure
- Human review & correction labor
- Regulatory/compliance penalties (financial services, healthcare, legal)
- Customer escalation costs from AI errors

### Module 6 — Residual Human Oversight
AI doesn't eliminate roles — it reshapes them. Quantifies:
- Supervision FTE (prompt engineering, output review, exception handling)
- Retraining and model maintenance
- Vendor management overhead

### Module 7 — J-Curve / Change Management
The hidden cost most AI business cases omit:
- Implementation and integration (months 1–6)
- Training and change management
- Productivity dip during transition (J-curve)
- Amortized over 3-year payback window

---

## Project Structure

```
ai-tco-framework/
├── ai-cost-calculator.html       # Full calculator — runs entirely in browser (no backend required)
├── ai-calculator-methodology.html # Complete methodology reference document
├── landingpage.html              # Marketing homepage
├── apps-script-email-relay/
│   └── Code.gs                   # Google Apps Script — email relay + lead capture (optional)
├── worker/
│   ├── src/index.js              # Cloudflare Worker — lead API + Resend email (optional)
│   ├── schema.sql                # D1 database schema
│   └── wrangler.toml             # Cloudflare deployment config
├── nginx.conf                    # Nginx config for self-hosting
└── Dockerfile                    # Docker deployment
```

---

## Quick Start

### Option A — Just open the file (zero setup)
```bash
git clone https://github.com/YOUR_USERNAME/ai-tco-framework.git
open ai-cost-calculator.html
```
The calculator is pure HTML/CSS/JS. No build step. No server. Open it in any browser.

### Option B — Self-host with Docker
```bash
docker build -t ai-tco .
docker run -p 8080:80 ai-tco
# Open http://localhost:8080
```

### Option C — Deploy to Cloudflare (for email/lead capture)
The `worker/` directory contains a Cloudflare Worker that handles lead capture and sends reports via [Resend](https://resend.com).

```bash
cd worker
npm install

# 1. Create D1 database
wrangler d1 create droidwork-leads
# Copy the database_id output into wrangler.toml

# 2. Initialize schema
wrangler d1 execute droidwork-leads --file schema.sql

# 3. Set your Resend API key
wrangler secret put RESEND_API_KEY

# 4. Update NOTIFY_EMAIL in src/index.js, then deploy
wrangler deploy
```

Then update `CONFIG.apiUrl` in `ai-cost-calculator.html` to point to your worker URL.

---

## Configuration

At the top of `ai-cost-calculator.html`, the `CONFIG` object controls all external endpoints:

```js
const CONFIG = {
  calculatorUrl:  'https://your-domain.com/calculator',
  methodologyUrl: 'https://your-domain.com/methodology',
  apiUrl:         'https://your-api.your-domain.com/leads', // optional
};
```

The calculator is **fully functional without the API** — email/lead capture is optional.

---

## Salary Data

The built-in salary matrix (`SALARY_DATA`) covers **12 job functions × 11 levels** (Intern through C-Suite) using US 2025 market medians. Sources: BLS OES 2024, Glassdoor 2025, Indeed 2025, SHRM, Radford/Aon.

Functions: Software Engineering, Data Science, Product Management, Finance, HR, Operations, Marketing, Sales, Legal, Customer Success, IT, Strategy.

---

## Contributing

Pull requests welcome. Areas where contributions are most valuable:

- **Salary data for other geographies** (EU, APAC, LatAm)
- **Model pricing updates** as vendor pricing changes
- **New cost modules** (e.g., EU AI Act compliance costs, model fine-tuning)
- **Translations** of the methodology

Please open an issue before large changes to align on approach.

---

## Why This Exists

Every enterprise AI business case I've seen uses a vendor-provided ROI calculator that quotes token/compute cost as the primary variable. This systematically underestimates real deployment cost by 4–7×.

This framework exists to give finance teams, engineering leaders, and executives the complete cost picture — so AI adoption decisions are made with eyes open.

---

## License

MIT — use it, fork it, embed it in your own tools. Attribution appreciated but not required.

---

*Maintained by [DroidWork.ai](https://droidwork.ai) · Contributions welcome*
