# DroidWork.ai — growth build

Everything here is verified by the three test suites in the repo root
(`node test-analytics.mjs`, `node test-seo.mjs`, `node test-new-pages.mjs`
— 113 checks, all passing).

Every number on every page comes from the live calculator via
`seo/extract-role-data.mjs`. Nothing on the site is hand-written arithmetic.

---

## 0. How to rebuild everything

```bash
npm install
node seo/extract-role-data.mjs      # writes role-data.json + role-data-full.json (132 rows)
node seo/build-role-pages.mjs       # /roles/*
node seo/build-insights.mjs         # /insights/*
node seo/build-dataset.mjs          # /data/* (+ CSV + JSON downloads)
node seo/build-advisory.mjs         # /advisory/
node seo/build-frameworks.mjs       # /frameworks/*
node seo/build-sitemap.mjs          # sitemap.xml + robots.txt + llms.txt  (run last)
```

`seo/serve.mjs` starts a local Node server that mirrors the production nginx
routing — no Docker needed for local development or tests.

---

## 1. Behaviour analytics — `dw-analytics.js`

Microsoft Clarity plus a funnel-event layer, loaded on all pages.
Clarity project ID `ykzej06mvs` is now configured; the file is live.

Adds beyond Clarity's default snippet:

- **Funnel:** `01_landed` → `02_ran_calculation` → `04_opened_pdf_modal` →
  `05_submitted_email` → `06_report_delivered`.
- **Segmentation tags:** role, level, utm_source, and an `outcome` bucket
  (`ai_cheaper` / `employee_cheaper`).
- **Exit tracking:** `exit_after_calc_no_email` — got the answer, left without converting.
- **PII masking.** The lead form is marked `data-clarity-mask` so session replays do
  not record names, work emails or company names in plain text.

Debug locally with `?dwdebug=1`.

---

## 2. Calculator resilience — Chart.js fallback

`calc()` used to run five Chart.js calls before assigning `window._calcState`. If
cdnjs was blocked (corporate firewall, ad-blocker, CDN outage), `calc()` threw
and every downstream lead was lost silently.

Chart calls are now wrapped in `try/catch`. Charts are best-effort; numbers,
PDF and lead always work. A `charts_unavailable` event fires so Clarity reports
how often the fallback triggers in the wild.

`test-analytics.mjs` now uses a Playwright route interceptor to block Chart.js
during the run, so the resilience path is exercised on every run — not just
when the sandbox happens to block cdnjs.

---

## 3. URL prefill — `?role=&level=`

`/calculator/?role=legal&level=director` pre-selects and recalculates. Invalid
values are ignored. Role pages depend on this.

---

## 4. Programmatic SEO — `/roles/` (12 pages + hub)

12 pages, each carrying Article + FAQPage schema and a deep link that
pre-fills the calculator. At mid level, 2 of 12 roles model as *more expensive*
than the employee (HR Generalist, Operations Analyst). Those pages lead with
that result — publishing negative cases is the credibility signal against
vendor calculators.

---

## 5. Open dataset — `/data/` (NEW · the citation asset)

`seo/extract-role-data.mjs` now loops **all 11 seniority levels × 12 functions
= 132 rows**, writing `seo/role-data-full.json`. `seo/build-dataset.mjs` renders:

- `/data/index.html` — sortable/filterable browse (search, function/level/outcome filter)
- `/data/ai-tco-dataset.csv` — 132 rows, 18 columns
- `/data/ai-tco-dataset.json` — same, machine-readable
- schema.org `Dataset` markup with `distribution` blocks pointing at the two downloads
- explicit citation format
- CC BY 4.0 license

This is the page LLMs quote. No other site on the internet has this table.

---

## 6. Advisory — `/advisory/` (NEW)

Three tiers:

- **$0 — Calculator.** Free, no login, PDF export.
- **$399 — AI Business Case Kit.** Self-serve toolkit + model spreadsheet +
  board-deck template + worked examples across 12 roles.
- **$5–$15k — TCO Review.** Two-week engagement: we run the model on your
  deployment and deliver a board-ready document.

Positioning: the calculator publishes negative results (`AI more expensive
than the employee`) for 2 of 12 roles at mid level. That is the differentiator —
this is the only advisory whose model is willing to say "do not buy".

Linked from the calculator results panel, every `/insights/` article CTA, and
the nav on every page.

Includes `Service` + `Offer` + `OfferCatalog` + `FAQPage` schema.

---

## 7. Named frameworks — `/frameworks/` (NEW)

Three named, citable concepts sourced from the methodology and the HITL essay:

- **`/frameworks/the-agentic-loop-multiplier/`** — the 4×–10× factor by which
  real per-task token consumption exceeds naive single-call estimates.
- **`/frameworks/the-concurrency-cliff/`** — the ~50 concurrent-user threshold
  at which provisioned throughput adds $2–6k/month fixed cost.
- **`/frameworks/constrain-escalate-contain/`** — the three-layer alternative
  to HITL, drawn from the human-factors research already cited in the essay.

Each page carries `DefinedTerm` + `Article` + `FAQPage` schema so the
definition is machine-readable and citable.

---

## 8. Authority content — `/insights/`

Two articles now:

- **`human-in-the-loop-will-not-protect-your-ai-agents`** — the HITL essay
  with 7 peer-reviewed citations in JSON-LD.
- **`the-forward-deployed-engineer-quadrant`** — the FDE demand map (2×2 of
  workflow integration complexity vs product customization required), sourced
  from `fde-quadrant.pdf`.

`ARTICLES` is now an `export`, so `build-sitemap.mjs` can pull the full list
from one place. Adding an article means appending to `ARTICLES` and rerunning
the pipeline; nothing else needs editing.

---

## 9. AI-crawler discoverability

- **`/llms.txt`** — plain-text site map following the `llmstxt.org` convention.
  Lists every section with a one-line description, plus a stated citation
  format.
- **`robots.txt`** — expanded to explicitly allow GPTBot, ClaudeBot,
  Claude-Web, anthropic-ai, PerplexityBot, Google-Extended, CCBot, Bytespider.
- **Schema.org coverage** — `Article` + `FAQPage` (roles, insights),
  `Dataset` + `DataDownload` (data), `Service` + `Offer` + `OfferCatalog`
  (advisory), `DefinedTerm` + `DefinedTermSet` (frameworks).
- **`Dataset` markup on `/data/`** is the single highest-ROI schema.org block
  for AI discovery — a downloadable table with a stated citation format is
  exactly what LLMs preferentially quote.

---

## 10. `sitemap.xml`

25 URLs, generated from a single authoritative source (`seo/build-sitemap.mjs`)
that reads `role-data.json`, `ARTICLES` from `build-insights.mjs`, and
`FRAMEWORKS` from `build-frameworks.mjs`. No more duplicated URL lists across
builders.

Submit to Google Search Console and Bing Webmaster Tools on deploy.

---

## 11. Nav wiring

Every existing page (`landingpage`, `ai-cost-calculator`, `ai-calculator-methodology`)
now links to `/data/`, `/frameworks/`, `/advisory/`, `/insights/`, `/roles/`
from both the top nav and the footer/related section.

---

## 12. Dockerfile

Additional `COPY` lines for `data/`, `advisory/`, `frameworks/` and `llms.txt`.
`nginx.conf` needs no changes — the existing `try_files $uri $uri/ /index.html`
fallback resolves the new directories.

---

## Test suites (113 checks total)

- `test-analytics.mjs` — 23 checks. Now blocks Chart.js via route interception
  so the resilience path is exercised on every run.
- `test-seo.mjs` — 15 checks. Role pages, deep-link prefill, sitemap URL count.
- `test-new-pages.mjs` — 75 checks. 200s, single H1, valid JSON-LD, schema.org
  type coverage per section, CSV/JSON download validity, `/data/` filter
  behaviour, mobile overflow at 390px, and internal-link resolution across
  every link on every new page.

Every test file now uses `seo/serve.mjs` for a local server and Playwright's
bundled Chromium — no more hardcoded `/opt/pw-browsers/...` paths.

---

## Still to check that I could not

1. **`NOTIFY_EMAIL` in the deployed Worker.** `worker/src/index.js` still reads
   `your-notify-email@example.com`. If the deployed copy does too, you are not
   being told about new leads (still written to D1). API itself is live and
   healthy.

2. **The token-share figure.** The landing page and README say token cost is
   ~20–22% of AI TCO. Running the model across all 132 rows returns **2–3%**.
   Both cannot be right. Either the defaults understate token volume or the
   headline claim is stale — and a CFO who runs the numbers will spot the gap.
