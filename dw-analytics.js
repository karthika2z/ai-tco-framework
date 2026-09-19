/**
 * DroidWork.ai — Behavior Analytics Layer
 * ----------------------------------------
 * Microsoft Clarity + a funnel-event wrapper.
 *
 * Why this file exists: Clarity's default snippet gives you heatmaps and session
 * replays, which tell you WHAT happened but not WHERE IN THE FUNNEL. This layer
 * adds custom events + segmentation tags so you can answer the questions that
 * actually drive revenue:
 *
 *   - Of people who ran a calculation, what % opened the PDF modal?
 *   - Of those, what % actually submitted an email?
 *   - Which ROLE are high-intent visitors modelling? (tells you who to sell to)
 *   - Do people who scroll the methodology convert better? (tells you what to build)
 *
 * PRIVACY: This file explicitly masks the lead-capture fields. Without this,
 * Clarity session replays would record execs' names, work emails, and company
 * names in plain text — a compliance problem you do not want in a B2B tool.
 *
 * SETUP (2 minutes):
 *   1. Go to https://clarity.microsoft.com and sign in with a Microsoft account.
 *   2. Create a project for droidwork.ai.
 *   3. Copy the Project ID (a short string like "abc123xyz").
 *   4. Paste it into CLARITY_PROJECT_ID below.
 * Until you do step 4, this file stays completely inert — it will not load
 * Clarity, will not error, and will not affect the page in any way.
 */
(function () {
  'use strict';

  // ─── CONFIG ────────────────────────────────────────────────────────────────
  var CLARITY_PROJECT_ID = 'ykzej06mvs';

  var DEBUG = /[?&]dwdebug=1/.test(location.search);

  // ─── SAFE NO-OP SCAFFOLD ───────────────────────────────────────────────────
  // window.dw always exists, so calls in page code never throw even if Clarity
  // is blocked by an ad-blocker, offline, or not yet configured.
  var dw = (window.dw = window.dw || {});
  var ready = false;

  function log() {
    if (DEBUG && window.console) console.log.apply(console, ['[dw]'].concat([].slice.call(arguments)));
  }

  function clarity() {
    try {
      if (window.clarity) window.clarity.apply(window, arguments);
    } catch (e) { /* never break the page for analytics */ }
  }

  /** Fire a funnel event. Visible in Clarity under Custom Events / Smart Events. */
  dw.track = function (name, props) {
    try {
      if (!name) return;
      clarity('event', name);
      if (props && typeof props === 'object') {
        for (var k in props) {
          if (Object.prototype.hasOwnProperty.call(props, k)) dw.tag(k, props[k]);
        }
      }
      log('event:', name, props || '');
    } catch (e) {}
  };

  /** Set a segmentation tag. Lets you filter recordings/heatmaps by this value. */
  dw.tag = function (key, value) {
    try {
      if (!key || value === undefined || value === null || value === '') return;
      clarity('set', String(key), String(value));
      log('tag:', key, '=', value);
    } catch (e) {}
  };

  /** Convenience: ordered funnel steps, so drop-off is readable in the dashboard. */
  var FUNNEL = {
    landed: '01_landed',
    calculated: '02_ran_calculation',
    viewedResults: '03_viewed_results',
    openedModal: '04_opened_pdf_modal',
    submitted: '05_submitted_email',
    delivered: '06_report_delivered'
  };
  dw.FUNNEL = FUNNEL;
  dw.funnel = function (step, props) {
    if (FUNNEL[step]) dw.track(FUNNEL[step], props);
    else dw.track(step, props);
  };

  // ─── PRIVACY: MASK PII BEFORE CLARITY EVER RECORDS IT ──────────────────────
  // Clarity honours data-clarity-mask on an element and its children.
  var PII_SELECTORS = [
    '#modal-name', '#modal-email', '#modal-company',
    'input[type="email"]', 'input[autocomplete="name"]', 'input[autocomplete="email"]'
  ];

  function maskPII() {
    try {
      PII_SELECTORS.forEach(function (sel) {
        var nodes = document.querySelectorAll(sel);
        for (var i = 0; i < nodes.length; i++) {
          nodes[i].setAttribute('data-clarity-mask', 'true');
        }
      });
      log('PII fields masked');
    } catch (e) {}
  }

  // ─── LOAD CLARITY ──────────────────────────────────────────────────────────
  function loadClarity(id) {
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', id);
  }

  function init() {
    maskPII();

    var configured = CLARITY_PROJECT_ID && CLARITY_PROJECT_ID !== 'REPLACE_WITH_YOUR_CLARITY_ID';

    if (!configured) {
      log('Clarity not configured — set CLARITY_PROJECT_ID in dw-analytics.js.');
      // In normal browsing this stays fully inert. With ?dwdebug=1 we still run
      // the instrumentation so you can verify the funnel wiring in the console
      // BEFORE you have a Clarity ID.
      if (!DEBUG) return;
    } else {
      loadClarity(CLARITY_PROJECT_ID);
      ready = true;
    }

    // Page-level segmentation so you can compare landing vs calculator vs methodology
    var path = location.pathname;
    var pageName = path === '/' ? 'landing'
      : /methodology/.test(path) ? 'methodology'
      : /calculator/.test(path) ? 'calculator'
      : path;

    dw.tag('page', pageName);
    dw.tag('referrer_host', document.referrer ? new URL(document.referrer).hostname : 'direct');

    // Capture campaign/source so you can tell LinkedIn traffic from organic search
    try {
      var q = new URLSearchParams(location.search);
      ['utm_source', 'utm_medium', 'utm_campaign', 'role', 'level'].forEach(function (k) {
        if (q.get(k)) dw.tag(k, q.get(k));
      });
    } catch (e) {}

    dw.funnel('landed', { entry_page: pageName });

    autoInstrument(pageName);
  }

  // ─── AUTOMATIC BEHAVIOUR SIGNALS ───────────────────────────────────────────
  function autoInstrument(pageName) {
    // Scroll depth — tells you if execs actually read "What Vendors Hide"
    var marks = [25, 50, 75, 90];
    var hit = {};
    function onScroll() {
      try {
        var h = document.documentElement;
        var denom = (h.scrollHeight - h.clientHeight);
        if (denom <= 0) return;
        var pct = (h.scrollTop / denom) * 100;
        marks.forEach(function (m) {
          if (!hit[m] && pct >= m) {
            hit[m] = true;
            dw.track('scroll_' + m, { deepest_scroll: String(m) });
          }
        });
      } catch (e) {}
    }
    window.addEventListener('scroll', onScroll, { passive: true });

    // Engaged time — 30s+ on page is a strong intent signal for B2B
    setTimeout(function () { dw.track('engaged_30s'); }, 30000);
    setTimeout(function () { dw.track('engaged_120s'); }, 120000);

    // Outbound clicks (GitHub, sources) — shows what they trust/verify
    document.addEventListener('click', function (e) {
      try {
        var a = e.target && e.target.closest ? e.target.closest('a') : null;
        if (!a || !a.href) return;
        var host = new URL(a.href, location.href).hostname;
        if (host && host !== location.hostname) {
          dw.track('outbound_click', { outbound_host: host });
        }
      } catch (err) {}
    }, true);

    // Exit without converting — the number that matters most on the calculator
    window.addEventListener('beforeunload', function () {
      try {
        if (pageName === 'calculator' && !dw._submitted) {
          dw.track(dw._calculated ? 'exit_after_calc_no_email' : 'exit_no_calc');
        }
      } catch (e) {}
    });
  }

  // ─── BOOT ──────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-mask if the modal is injected/changed later
  dw.remask = maskPII;
})();
