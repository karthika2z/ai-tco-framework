/**
 * DroidWork.ai — reusable lead-capture form.
 *
 * Drop this on any page. Add a trigger:
 *   <a href="#" data-dw-lead="review_request" data-dw-lead-title="Book a TCO Review">Book a Review</a>
 *
 * When clicked, opens a modal form. On submit, POSTs to api.droidwork.ai/leads
 * with intent + source + agent_referral packed into the `role` field so we do
 * not need a worker migration to start collecting.
 *
 * Success behaviour: shows confirmation copy + fires window.dw.funnel('submitted').
 * Failure: keeps the form open, shows the error, still fires an 'lead_error' event.
 *
 * Intent slugs (keep short — used for filtering in D1):
 *   review_request    — TCO Review inquiry ($5-15k)
 *   kit_request       — AI Business Case Kit ($399)
 *   calculator_signup — free calculator (nudged from advisory)
 *   dataset_onepager  — /data/ gated one-pager
 *   frameworks_pack   — /frameworks/ gated glossary pack
 */
(function () {
  'use strict';

  var API_URL = 'https://api.droidwork.ai/leads';

  // ─── AGENT REFERRAL DETECTION ───────────────────────────────────────────────
  // These substrings appear in Referer / UA / URL params from the major AI
  // surfaces that link out to sources. We flag the visit so it lands in the
  // lead payload + Clarity tags. Purely additive — nothing gated on this.
  var AGENT_SIGNATURES = [
    { key: 'chatgpt',    host: /(^|\.)chat\.openai\.com|(^|\.)chatgpt\.com/i },
    { key: 'claude',     host: /(^|\.)claude\.ai/i },
    { key: 'perplexity', host: /(^|\.)perplexity\.ai/i },
    { key: 'bing_copilot', host: /(^|\.)bing\.com|(^|\.)copilot\.microsoft\.com/i },
    { key: 'google_sge', host: /(^|\.)google\.com/i, param: 'udm' },
    { key: 'gemini',     host: /(^|\.)gemini\.google\.com/i },
    { key: 'poe',        host: /(^|\.)poe\.com/i },
    { key: 'you',        host: /(^|\.)you\.com/i },
    { key: 'kagi',       host: /(^|\.)kagi\.com/i },
  ];

  function detectAgentReferral() {
    try {
      var q = new URLSearchParams(location.search);
      // Explicit override wins — for cases where the user prints an "?agent=chatgpt"
      // into a citation link. Costs nothing to honour.
      if (q.get('agent'))     return q.get('agent').toLowerCase().slice(0, 24);
      if (q.get('utm_source')) {
        var src = q.get('utm_source').toLowerCase();
        if (/(chatgpt|openai|claude|perplexity|copilot|gemini|bard|poe|you\.com|kagi)/.test(src)) return src.slice(0, 24);
      }

      var ref = document.referrer || '';
      if (!ref) return '';
      var u;
      try { u = new URL(ref); } catch { return ''; }
      for (var i = 0; i < AGENT_SIGNATURES.length; i++) {
        var s = AGENT_SIGNATURES[i];
        if (!s.host.test(u.hostname)) continue;
        if (s.param && !u.searchParams.has(s.param)) continue;
        return s.key;
      }
      return '';
    } catch { return ''; }
  }

  var AGENT = detectAgentReferral();

  // Expose read-only for other scripts / tests.
  window.dwLead = window.dwLead || {};
  window.dwLead.agent = AGENT;

  if (AGENT && window.dw && typeof window.dw.tag === 'function') {
    window.dw.tag('agent_referral', AGENT);
    window.dw.track('agent_referral_landed', { agent_referral: AGENT });
  } else if (AGENT) {
    // dw-analytics.js loads on all pages, but hedge in case it is blocked.
    window.addEventListener('load', function () {
      if (window.dw && typeof window.dw.tag === 'function') {
        window.dw.tag('agent_referral', AGENT);
        window.dw.track('agent_referral_landed', { agent_referral: AGENT });
      }
    });
  }

  // ─── INTENT COPY ────────────────────────────────────────────────────────────
  var INTENTS = {
    review_request: {
      title: 'Book a 15-min TCO Review Intake',
      lede: '15-minute call. We will tell you if the model returns a defensible number for your case — and what a full review would cost. This is not a sales call: if a $0 or $399 tier is the right fit, we will say so.',
      submit: 'Request an Intake',
      thanks: 'Thanks — Karthik will reply from karthik@droidwork.ai within one business day with a couple of proposed call times.',
    },
    kit_request: {
      title: 'Get the AI Business Case Kit',
      lede: 'Model spreadsheet, board-deck template, worked examples across 12 roles, 90 days of email support. $399 one-time. Fill in below and we will email delivery and payment details.',
      submit: 'Request the Kit',
      thanks: 'Thanks — we will email delivery and payment details within one business day.',
    },
    calculator_signup: {
      title: 'Get the Calculator + Executive Summary',
      lede: 'One-click access to the calculator and a short summary of what the model prices. No spam.',
      submit: 'Send Me the Summary',
      thanks: 'Thanks — check your inbox for the summary. You can also open the calculator now.',
    },
    dataset_onepager: {
      title: 'Get the Executive One-Pager',
      lede: 'Two pages summarising the 132-row dataset — the roles where AI comes out ahead, the ones where it does not, and how to read the CSV. Delivered by email.',
      submit: 'Email Me the One-Pager',
      thanks: 'Thanks — we will send the one-pager within 24 hours. In the meantime, the raw CSV is above.',
    },
    frameworks_pack: {
      title: 'Get the Frameworks Glossary Pack',
      lede: 'A one-page reference card summarising the Agentic Loop Multiplier, the Concurrency Cliff, and Constrain-Escalate-Contain — with the formulas and sources. Delivered by email.',
      submit: 'Email Me the Reference Card',
      thanks: 'Thanks — we will send the reference card within 24 hours.',
    },
  };

  // ─── STYLES (injected once) ─────────────────────────────────────────────────
  var CSS = `
.dwl-back{position:fixed;inset:0;background:rgba(6,14,27,.72);backdrop-filter:blur(6px);z-index:9999;display:none;align-items:center;justify-content:center;padding:20px}
.dwl-back.open{display:flex}
.dwl-mod{background:#0f2042;border:1px solid rgba(255,255,255,.08);border-radius:16px;max-width:500px;width:100%;color:#f0f4f8;font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;max-height:90vh;overflow-y:auto;box-shadow:0 30px 80px rgba(0,0,0,.5)}
.dwl-hd{padding:26px 28px 8px;position:relative}
.dwl-hd h3{font-size:22px;font-weight:800;color:#fff;margin:0 0 8px;letter-spacing:-.01em;line-height:1.2}
.dwl-hd p{font-size:14px;color:#8ca0b8;margin:0;line-height:1.55}
.dwl-x{position:absolute;top:14px;right:14px;background:transparent;border:0;color:#8ca0b8;font-size:22px;line-height:1;cursor:pointer;width:32px;height:32px;border-radius:8px}
.dwl-x:hover{background:rgba(255,255,255,.06);color:#fff}
.dwl-bd{padding:14px 28px 26px}
.dwl-row{margin-bottom:12px}
.dwl-row label{display:block;font-size:11.5px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:#8ca0b8;margin-bottom:6px}
.dwl-row input, .dwl-row textarea{width:100%;background:#162d5a;border:1px solid rgba(255,255,255,.08);border-radius:9px;padding:11px 13px;color:#f0f4f8;font-size:14px;font-family:inherit;box-sizing:border-box}
.dwl-row input:focus, .dwl-row textarea:focus{outline:0;border-color:#00d4a8;background:#0f2042}
.dwl-row textarea{min-height:70px;resize:vertical}
.dwl-sub{background:#00d4a8;color:#04241d;font-weight:700;font-size:14.5px;padding:13px 22px;border-radius:9px;border:0;width:100%;cursor:pointer;margin-top:6px;transition:filter .15s,transform .15s}
.dwl-sub:hover:not(:disabled){filter:brightness(1.08);transform:translateY(-1px)}
.dwl-sub:disabled{opacity:.55;cursor:wait}
.dwl-note{font-size:12px;color:#8ca0b8;text-align:center;margin-top:12px;line-height:1.5}
.dwl-err{background:rgba(248,113,113,.12);border:1px solid rgba(248,113,113,.35);color:#fca5a5;font-size:13px;padding:10px 12px;border-radius:8px;margin-bottom:14px}
.dwl-ok{padding:36px 28px 30px;text-align:center}
.dwl-ok-icon{width:52px;height:52px;border-radius:50%;background:rgba(0,212,168,.15);color:#00d4a8;display:inline-flex;align-items:center;justify-content:center;font-size:24px;margin-bottom:14px;font-weight:700}
.dwl-ok h3{font-size:20px;font-weight:800;color:#fff;margin:0 0 10px}
.dwl-ok p{font-size:14.5px;color:#cfdae7;margin:0 0 18px;line-height:1.6}
.dwl-ok .dwl-sub{width:auto;padding:11px 22px}
@media(max-width:520px){.dwl-hd,.dwl-bd,.dwl-ok{padding-left:20px;padding-right:20px}.dwl-hd h3{font-size:19px}}
`;

  var styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  // ─── DOM ────────────────────────────────────────────────────────────────────
  var wrap = document.createElement('div');
  wrap.className = 'dwl-back';
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-modal', 'true');
  wrap.innerHTML = `
    <div class="dwl-mod">
      <div class="dwl-hd">
        <button class="dwl-x" type="button" aria-label="Close">×</button>
        <h3 id="dwl-title">Get in touch</h3>
        <p id="dwl-lede">Tell us who you are and we will reply within one business day.</p>
      </div>
      <form class="dwl-bd" id="dwl-form" novalidate>
        <div id="dwl-error" class="dwl-err" style="display:none"></div>
        <div class="dwl-row"><label for="dwl-name">Name</label><input id="dwl-name" name="name" autocomplete="name" required></div>
        <div class="dwl-row"><label for="dwl-email">Work email</label><input id="dwl-email" name="email" type="email" autocomplete="email" required></div>
        <div class="dwl-row"><label for="dwl-company">Company</label><input id="dwl-company" name="company" autocomplete="organization" required></div>
        <div class="dwl-row" id="dwl-context-row"><label for="dwl-context">What are you evaluating? <span style="text-transform:none;font-weight:400;color:#6c85a3">(optional)</span></label><textarea id="dwl-context" name="context" placeholder="e.g. AI copilot for our legal team, 40 users."></textarea></div>
        <button type="submit" class="dwl-sub" id="dwl-submit">Send</button>
        <p class="dwl-note">No mailing list. We will reply from karthik@droidwork.ai.</p>
      </form>
      <div class="dwl-ok" id="dwl-ok" style="display:none">
        <div class="dwl-ok-icon">✓</div>
        <h3 id="dwl-ok-title">Message sent</h3>
        <p id="dwl-ok-body">Thanks — we will be in touch within one business day.</p>
        <button type="button" class="dwl-sub" id="dwl-ok-close">Close</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);

  var titleEl   = wrap.querySelector('#dwl-title');
  var ledeEl    = wrap.querySelector('#dwl-lede');
  var formEl    = wrap.querySelector('#dwl-form');
  var errorEl   = wrap.querySelector('#dwl-error');
  var okEl      = wrap.querySelector('#dwl-ok');
  var okTitle   = wrap.querySelector('#dwl-ok-title');
  var okBody    = wrap.querySelector('#dwl-ok-body');
  var submitBtn = wrap.querySelector('#dwl-submit');
  var currentIntent = null;

  function open(intent, opts) {
    currentIntent = intent;
    var cfg = INTENTS[intent] || INTENTS.review_request;
    titleEl.textContent   = (opts && opts.title)  || cfg.title;
    ledeEl.textContent    = (opts && opts.lede)   || cfg.lede;
    submitBtn.textContent = (opts && opts.submit) || cfg.submit;
    okTitle.textContent   = 'Thanks — noted.';
    okBody.textContent    = (opts && opts.thanks) || cfg.thanks;
    errorEl.style.display = 'none';
    formEl.style.display = '';
    okEl.style.display = 'none';
    formEl.reset();
    wrap.classList.add('open');
    setTimeout(function () { wrap.querySelector('#dwl-name').focus(); }, 60);

    if (window.dw && typeof window.dw.track === 'function') {
      window.dw.track('lead_form_opened', { intent: intent, source: location.pathname, agent_referral: AGENT });
    }
  }

  function close() {
    wrap.classList.remove('open');
  }

  wrap.querySelector('.dwl-x').addEventListener('click', close);
  wrap.querySelector('#dwl-ok-close').addEventListener('click', close);
  wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && wrap.classList.contains('open')) close(); });

  formEl.addEventListener('submit', async function (e) {
    e.preventDefault();
    errorEl.style.display = 'none';

    var name    = (wrap.querySelector('#dwl-name').value    || '').trim();
    var email   = (wrap.querySelector('#dwl-email').value   || '').trim();
    var company = (wrap.querySelector('#dwl-company').value || '').trim();
    var context = (wrap.querySelector('#dwl-context').value || '').trim();

    if (!name)    return showError('Please add your name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError('Please use a valid work email.');
    if (!company) return showError('Please add your company.');

    // The worker's `role` field is the only free-form column we can piggyback on
    // without a schema migration. We pack intent + source + agent + context
    // into it as a machine-parseable string. When we cut a proper migration
    // this becomes real columns.
    var meta = [
      'intent=' + currentIntent,
      'source=' + location.pathname,
    ];
    if (AGENT) meta.push('agent=' + AGENT);
    if (context) meta.push('note=' + context.replace(/\s+/g, ' ').slice(0, 240));
    var rolePayload = meta.join(' | ');

    submitBtn.disabled = true;
    var prevText = submitBtn.textContent;
    submitBtn.textContent = 'Sending…';

    try {
      var res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name,
          email: email,
          company: company,
          role: rolePayload,
        }),
      });

      if (!res.ok) {
        var err = 'Sorry — that did not go through. Please email karthik@droidwork.ai directly.';
        try { var body = await res.json(); if (body && body.error) err = body.error; } catch {}
        throw new Error(err);
      }

      if (window.dw && typeof window.dw.funnel === 'function') {
        window.dw.funnel('submitted', { intent: currentIntent, source: location.pathname, agent_referral: AGENT });
      }

      formEl.style.display = 'none';
      okEl.style.display = '';
    } catch (netErr) {
      showError(netErr.message || 'Network error — please try again or email karthik@droidwork.ai.');
      if (window.dw && typeof window.dw.track === 'function') {
        window.dw.track('lead_error', { intent: currentIntent, source: location.pathname, agent_referral: AGENT });
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = prevText;
    }
  });

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = '';
  }

  // ─── PUBLIC API + AUTO-BINDING ──────────────────────────────────────────────
  window.dwLead.open  = open;
  window.dwLead.close = close;

  function bind() {
    var els = document.querySelectorAll('[data-dw-lead]');
    for (var i = 0; i < els.length; i++) {
      if (els[i].__dwBound) continue;
      els[i].__dwBound = true;
      els[i].addEventListener('click', function (ev) {
        ev.preventDefault();
        var el = ev.currentTarget;
        var intent = el.getAttribute('data-dw-lead') || 'review_request';
        var opts = {};
        ['title', 'lede', 'submit', 'thanks'].forEach(function (k) {
          var v = el.getAttribute('data-dw-lead-' + k);
          if (v) opts[k] = v;
        });
        open(intent, opts);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
  // Re-scan in case pages inject triggers after load
  new MutationObserver(bind).observe(document.body, { childList: true, subtree: true });
})();
