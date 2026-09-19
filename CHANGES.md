# DroidWork.ai — growth build

Everything here is verified by the two test suites in the repo root
(`node test-analytics.mjs`, `node test-seo.mjs` — 38 checks, all passing).

---

## 1. Behaviour analytics — `dw-analytics.js` (new)

Microsoft Clarity plus a funnel-event layer, loaded on all pages.

**You must do one thing before this does anything:** create a project at
<https://clarity.microsoft.com>, then replace `REPLACE_WITH_YOUR_CLARITY_ID` at the
top of `dw-analytics.js`. Until then the file stays completely inert — it will not
load Clarity, throw, or affect the page.

What it adds beyond Clarity's default snippet:

- **A real funnel:** `01_landed` → `02_ran_calculation` → `04_opened_pdf_modal` →
  `05_submitted_email` → `06_report_delivered`, so you can see *where* people leave,
  not just that they did.
- **Segmentation tags:** role, level, utm_source, and an `outcome` bucket
  (`ai_cheaper` / `employee_cheaper`) so you can filter replays by what the visitor saw.
- **Exit tracking:** `exit_after_calc_no_email` is the number that matters most —
  people who got their answer and left without converting.
- **PII masking.** The lead form (`#modal-name`, `#modal-email`, `#modal-company`) is
  marked `data-clarity-mask`. Without this, Clarity session replays would record
  executives' names, work emails and company names in plain text. That is a
  compliance problem you do not want in a B2B tool, so it is on by default.

Debug locally with `?dwdebug=1` — the full funnel logs to the console even before
you have a Clarity ID.

---

## 2. Bug fix — the calculator broke silently behind corporate firewalls

**This one costs you leads today.**

In `calc()`, the five chart calls ran *before* `window._calcState` was assigned.
Chart.js loads from cdnjs. If that request fails — corporate firewall, ad-blocker,
CDN outage — `calc()` threw, `_calcState` was never set, and from the visitor's side:

- the PDF modal showed `$—` for every value,
- the PDF export produced nothing usable,
- the lead was lost, silently, with no error shown.

Your entire audience is enterprise executives, who sit behind exactly the networks
that block CDN domains.

The chart calls are now wrapped in `try/catch`. Charts are best-effort; the numbers,
the PDF and the lead always work. A `charts_unavailable` event fires so Clarity will
tell you how often this actually happens in the wild.

Verified: with Chart.js fully blocked, the calculator still returns real figures and
the modal populates correctly.

---

## 3. URL prefill — `?role=&level=`

`/calculator/?role=legal&level=director` pre-selects the role and recalculates.
Invalid values are ignored and fall back to the page default. The role pages depend
on this; it is also useful for any campaign link.

---

## 4. Programmatic SEO — `/roles/` (12 pages + hub)

```
node seo/extract-role-data.mjs   # drives the real calculator, writes role-data.json
node seo/build-role-pages.mjs    # renders the pages
```

Numbers are **extracted from your live calculator**, never hand-written — so if the
methodology changes, re-run and the pages stay truthful. Each page carries
role-specific editorial content (`seo/role-content.mjs`), Article + FAQPage schema,
a deep link into the pre-filled calculator, and internal links.

Two roles (HR Generalist, Operations Analyst) model as *more expensive* than the
employee. Those pages lead with that result. Publishing the negative cases is the
strongest credibility signal you have against vendor-built calculators.

To add senior/director pages, change `LEVEL` in `extract-role-data.mjs` and re-run.

---

## 5. Authority content — `/insights/`

`node seo/build-insights.mjs`

Your HITL essay, published properly: Article schema with all **7 academic citations
machine-readable**, a FAQPage block answering the questions people actually type,
author markup pointing at your LinkedIn, and a CTA into the security cost dimension.

Citation-dense, framework-driven writing is what LLMs quote. This page is your best
shot at being the cited source when someone asks an AI about HITL or agent governance.

Add the FDE quadrant as the second article by appending to the `ARTICLES` array.

---

## 6. `sitemap.xml` + `robots.txt`

18 URLs. `robots.txt` explicitly welcomes GPTBot, ClaudeBot and PerplexityBot —
being cited by AI assistants is a distribution channel, not a threat.

Submit the sitemap to Google Search Console and Bing Webmaster Tools on deploy.

---

## Deploy

```bash
node seo/extract-role-data.mjs   # optional: only if the model changed
node seo/build-role-pages.mjs
node seo/build-insights.mjs      # run after roles — also writes the sitemap
docker build -t droidwork . && docker run -p 8080:8080 droidwork
```

The `Dockerfile` already copies `roles/`, `insights/`, `dw-analytics.js`,
`sitemap.xml` and `robots.txt`. No nginx changes were needed.

---

## Two things to check that I could not

1. **`NOTIFY_EMAIL` in the deployed Worker.** `worker/src/index.js` still reads
   `your-notify-email@example.com`. If the deployed copy does too, you are not being
   told about new leads. They are still written to D1, so nothing is lost — but you
   would not know they arrived. I verified the API itself is live and healthy
   (`/health` returns 200; `/leads` correctly rejects invalid input).

2. **The token-share figure.** The landing page and README say token cost is ~20–22%
   of AI TCO. Running your own model across all 12 roles at default settings returns
   **2–3%**. Both cannot be right. Either the defaults understate token volume or the
   headline claim is stale — and a CFO who runs the numbers will spot the gap. Worth
   resolving before you drive traffic at it, because the accuracy of that claim is
   the whole product.
