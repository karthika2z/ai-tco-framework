"""
LoopQuant — Phase 0 UI Mockup
A fully runnable Streamlit app with hardcoded mock data.
All screens, transitions, and charts are implemented.
No real LLM or market data yet — swap in Phase 1.
"""

import time
from datetime import datetime

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from mock_data import AUDIT_LOG, MOCK_VARIANTS, generate_equity_curve, generate_rolling_ic, get_mock_results

# ── page config (must be first Streamlit call) ───────────────────────────────
st.set_page_config(
    page_title="LoopQuant · Strategy Builder",
    page_icon="🔄",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ── session state ─────────────────────────────────────────────────────────────
_DEFAULTS = {
    "phase": "input",          # input | running | results
    "idea": "",
    "universe": "Stocks (US Equities)",
    "holding_period": "Swing (2–10 days)",
    "timeframe": "Last 2 Years",
    "results": None,
}
for k, v in _DEFAULTS.items():
    if k not in st.session_state:
        st.session_state[k] = v

# ── global styles ─────────────────────────────────────────────────────────────
st.markdown("""
<style>
    /* hide default Streamlit top padding */
    .block-container { padding-top: 1.5rem; }

    .lq-title {
        font-size: 2.6rem; font-weight: 900; letter-spacing: -0.03em;
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        margin-bottom: 0;
    }
    .lq-tagline { color: #6b7280; font-size: 1.05rem; margin-bottom: 1.6rem; }

    /* hero cards */
    .hero-pass {
        background: linear-gradient(135deg, #f0fdf4, #dcfce7);
        border: 2px solid #16a34a; border-radius: 16px;
        padding: 1.4rem 1.8rem; margin-bottom: 1.2rem;
    }
    .hero-fail {
        background: linear-gradient(135deg, #fffbeb, #fef3c7);
        border: 2px solid #d97706; border-radius: 16px;
        padding: 1.4rem 1.8rem; margin-bottom: 1.2rem;
    }

    /* metric row inside hero */
    .hero-metric { display: inline-block; margin-right: 2.5rem; }
    .hero-metric-label { font-size: 0.72rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em; }
    .hero-metric-value { font-size: 1.7rem; font-weight: 800; }

    /* step list item colours */
    .step-done   { color: #16a34a; font-weight: 600; }
    .step-active { color: #2563eb; font-weight: 600; }
    .step-wait   { color: #9ca3af; }

    /* metric cards */
    [data-testid="metric-container"] {
        background: #f9fafb; border-radius: 12px; padding: 0.8rem 1rem;
    }
</style>
""", unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════════
#  SCREEN 1 — INPUT
# ═══════════════════════════════════════════════════════════════════════════════
def show_input() -> None:
    col_main, col_info = st.columns([3, 1], gap="large")

    # ── left column ──────────────────────────────────────────────────────────
    with col_main:
        st.markdown('<p class="lq-title">🔄 LoopQuant</p>', unsafe_allow_html=True)
        st.markdown(
            '<p class="lq-tagline">Turn any trading idea into a statistically validated strategy — in minutes.</p>',
            unsafe_allow_html=True,
        )

        idea = st.text_area(
            "Describe your trading idea in plain English",
            value=st.session_state.idea,
            height=155,
            placeholder=(
                'Example: "Buy BTC when it dips below the 50-day moving average and sell '
                'when it rises above the 200-day average, but only when volatility is low."\n\n'
                'Or: "Find stocks breaking out to new 52-week highs on high volume after '
                'a period of tight consolidation — only in strong sectors."'
            ),
            help="No quant knowledge needed — just describe what you think might work!",
        )

        c1, c2, c3 = st.columns(3)
        with c1:
            universe = st.selectbox(
                "Asset Universe",
                ["Stocks (US Equities)", "Crypto", "Both"],
                help="Which assets should the strategy trade?",
            )
        with c2:
            holding_period = st.selectbox(
                "Holding Period",
                ["Short-term (1–2 days)", "Swing (2–10 days)", "Medium-term (2–8 weeks)", "Long-term (months)"],
                index=1,
                help="How long should each position be held on average?",
            )
        with c3:
            timeframe = st.selectbox(
                "Backtest Window",
                ["Last 1 Year", "Last 2 Years", "Last 3 Years", "Last 5 Years"],
                index=1,
                help="Historical period for testing. More data → more reliable results.",
            )

        st.markdown("&nbsp;")

        idea_ok = len(idea.strip()) >= 10
        run_clicked = st.button(
            "🚀  Run the Loop & Find Validated Strategies",
            type="primary",
            use_container_width=True,
            disabled=not idea_ok,
        )

        if idea.strip() and not idea_ok:
            st.caption("⚠️  Please add a bit more detail (at least a few words).")

        if run_clicked and idea_ok:
            st.session_state.update(
                idea=idea,
                universe=universe,
                holding_period=holding_period,
                timeframe=timeframe,
                phase="running",
            )
            st.rerun()

        # ── how it works ─────────────────────────────────────────────────────
        with st.expander("ℹ️  How does LoopQuant work?"):
            st.markdown("""
**LoopQuant runs a 6-step closed loop — automatically:**

1. **Generate** — AI creates 3–5 distinct strategy variants from your idea
2. **Backtest** — Each variant is tested against real historical market data
3. **Score** — Variants ranked by ICIR (signal quality), Half-life (durability), Sharpe
4. **Diagnose** — AI explains in plain English why each variant worked or failed
5. **Out-of-Sample Gate** — Top candidates re-tested on data they've *never* seen
6. **Promote** — Only strategies that pass every gate reach you as recommendations

*This mimics how professional quant funds validate strategies — without needing a PhD.*
""")

        # ── advanced settings ─────────────────────────────────────────────────
        with st.expander("⚙️  Advanced Settings"):
            ca, cb = st.columns(2)
            with ca:
                st.slider("Minimum ICIR threshold", 0.5, 2.0, 1.0, 0.1,
                          help="Strategies below this ICIR are rejected. Higher = stricter filter.")
                st.slider("Minimum half-life (days)", 3, 30, 10, 1,
                          help="Signal must stay predictive for at least this many days.")
                st.slider("Number of variants to generate", 2, 6, 4, 1)
            with cb:
                st.slider("Max refinement iterations", 1, 5, 2, 1)
                st.slider("OOS data split (%)", 10, 40, 20, 5,
                          help="Percentage of data held out for out-of-sample testing.")
                st.selectbox("Data source",
                             ["Alpaca (primary)", "Yahoo Finance", "Mock data (demo)"],
                             index=2,
                             help="Phase 0: mock only. Real providers coming in Phase 1.")

    # ── right column ─────────────────────────────────────────────────────────
    with col_info:
        st.markdown("### 📋 What you'll get")
        st.markdown("""
- ✅ **Ranked variants** with ICIR, IC, Half-life
- 📈 **Equity curve** vs. benchmark
- 🔍 **Plain-English diagnosis** of what worked & why
- 🛡️ **Out-of-sample validation** — no fake results
- 📄 **Downloadable report** for your records
""")
        st.divider()

        st.markdown("### 📊 Metric glossary")
        with st.expander("What is ICIR?"):
            st.markdown(
                "**Information Coefficient IR** — how *consistently* a signal predicts "
                "future returns. Think batting average for your strategy's edge. "
                "**≥ 1.0 is good; ≥ 1.5 is excellent.**"
            )
        with st.expander("What is Half-life?"):
            st.markdown(
                "**Signal decay speed** — how quickly predictive power fades after the "
                "signal fires. 10–30 days is healthy for swing trading. Too short = noisy; "
                "too long = slow."
            )
        with st.expander("What is Sharpe Ratio?"):
            st.markdown(
                "**Risk-adjusted return** — annual return ÷ annual volatility. "
                "**> 1.0 is solid; > 1.5 is very good; > 2.0 is exceptional.**"
            )
        with st.expander("What is the OOS Gate?"):
            st.markdown(
                "We hold back a slice of historical data the strategy never sees during "
                "development, then test it fresh. If ICIR collapses, the strategy was "
                "overfit to noise — and we reject it."
            )


# ═══════════════════════════════════════════════════════════════════════════════
#  SCREEN 2 — RUNNING (simulated progress)
# ═══════════════════════════════════════════════════════════════════════════════
def show_running() -> None:
    idea_short = st.session_state.idea[:80] + ("…" if len(st.session_state.idea) > 80 else "")

    st.markdown("## 🔄 Running the Loop…")
    st.markdown(f"*Idea: **\"{idea_short}\"***")
    st.divider()

    STEPS = [
        (
            "🧠", "Generating strategy variants",
            "Asking AI to create 4 distinct approaches to your idea…",
            "Created 4 variants: MA Crossover, RSI Mean Reversion, Momentum Breakout, Earnings Surprise.",
        ),
        (
            "📊", "Backtesting on historical data",
            "Running each variant against 2 years of price data…",
            "All 4 backtests complete. Returns range from +6.1 % to +34.2 % over 2 years.",
        ),
        (
            "📐", "Scoring — IC, ICIR & Half-life",
            "Calculating signal quality and decay metrics…",
            "Best ICIR: 1.42 (MA Crossover). 2 variants fall below the 1.0 threshold.",
        ),
        (
            "🔍", "Diagnosing results",
            "AI is analysing why some variants worked and others failed…",
            "Key finding: volatility filter is the main differentiator. Half-life < 10 days flags overfit.",
        ),
        (
            "🛡️", "Out-of-Sample Gate",
            "Testing top 2 survivors on fresh data they have never seen…",
            "MA Crossover OOS ICIR: 1.38 ✅  RSI variant OOS ICIR: 1.09 ✅  Both passed.",
        ),
        (
            "✅", "Building your report",
            "Formatting results and preparing insights…",
            "Done! 2 strategies survived all gates. 1 promoted as primary recommendation.",
        ),
    ]

    placeholders = [st.empty() for _ in STEPS]
    prog = st.progress(0)
    status_msg = st.empty()

    if st.button("✕  Cancel"):
        st.session_state.phase = "input"
        st.rerun()

    for i, (icon, title, doing, done) in enumerate(STEPS):
        # Repaint all rows on every iteration
        for j, (sicon, stitle, sdoing, sdone) in enumerate(STEPS):
            with placeholders[j].container():
                if j < i:
                    st.success(f"{sicon}  **{stitle}** — {sdone}")
                elif j == i:
                    st.info(f"⏳  **{stitle}** — {doing}")
                else:
                    st.markdown(
                        f"<span class='step-wait'>○  {stitle}</span>",
                        unsafe_allow_html=True,
                    )

        prog.progress((i + 0.6) / len(STEPS))
        status_msg.caption(f"Step {i + 1} of {len(STEPS)}: {doing}")
        time.sleep(1.8)

    prog.progress(1.0)
    status_msg.empty()

    st.session_state.results = get_mock_results()
    st.session_state.phase = "results"
    st.rerun()


# ═══════════════════════════════════════════════════════════════════════════════
#  SCREEN 3 — RESULTS
# ═══════════════════════════════════════════════════════════════════════════════
def show_results() -> None:
    results = st.session_state.results
    best = results["best"]
    variants = results["variants"]

    n_survived = sum(1 for v in variants if "❌" not in v["status"])
    n_icir_pass = sum(1 for v in variants if v["icir"] >= 1.0)
    n_promoted = sum(1 for v in variants if "Promoted" in v["status"])

    # ── page header ──────────────────────────────────────────────────────────
    hcol1, hcol2 = st.columns([5, 1])
    with hcol1:
        idea_short = st.session_state.idea[:90] + ("…" if len(st.session_state.idea) > 90 else "")
        st.markdown("## 📊 Results")
        st.markdown(f"*Idea: **\"{idea_short}\"***")
    with hcol2:
        if st.button("← New Run", use_container_width=True):
            st.session_state.phase = "input"
            st.rerun()

    # ── hero card ─────────────────────────────────────────────────────────────
    if n_survived > 0:
        st.markdown(f"""
<div class="hero-pass">
  <div style="font-size:.8rem;color:#15803d;font-weight:700;text-transform:uppercase;letter-spacing:.07em;">
    ✅ Best Validated Strategy Found
  </div>
  <div style="font-size:1.75rem;font-weight:900;color:#111827;margin:.3rem 0 .4rem;">
    {best['name']}
  </div>
  <div style="color:#374151;margin-bottom:1rem;">{best['description']}</div>
  <div>
    <span class="hero-metric">
      <div class="hero-metric-label">ICIR (in-sample)</div>
      <div class="hero-metric-value" style="color:#15803d">{best['icir']}</div>
    </span>
    <span class="hero-metric">
      <div class="hero-metric-label">OOS ICIR</div>
      <div class="hero-metric-value" style="color:#16a34a">{best['oos_icir']}</div>
    </span>
    <span class="hero-metric">
      <div class="hero-metric-label">Sharpe</div>
      <div class="hero-metric-value" style="color:#111827">{best['sharpe']}</div>
    </span>
    <span class="hero-metric">
      <div class="hero-metric-label">Half-life</div>
      <div class="hero-metric-value" style="color:#111827">{best['half_life']} days</div>
    </span>
    <span class="hero-metric">
      <div class="hero-metric-label">2-Yr Return</div>
      <div class="hero-metric-value" style="color:#15803d">+{best['total_return']}%</div>
    </span>
    <span class="hero-metric">
      <div class="hero-metric-label">Max Drawdown</div>
      <div class="hero-metric-value" style="color:#dc2626">{best['max_dd']}%</div>
    </span>
  </div>
</div>
""", unsafe_allow_html=True)
    else:
        st.markdown("""
<div class="hero-fail">
  <div style="font-size:.8rem;color:#d97706;font-weight:700;text-transform:uppercase;">
    ⚠️ No Strategies Survived All Tests
  </div>
  <div style="font-size:1.4rem;font-weight:800;color:#111827;margin:.3rem 0;">
    This is common — and it's protecting your capital.
  </div>
  <div style="color:#374151;">
    All variants either had insufficient signal quality (ICIR &lt; 1.0), decaying signals
    (half-life &lt; 10 days), or performance collapsed on unseen data. Use the diagnosis
    below to refine your idea and try again.
  </div>
</div>
""", unsafe_allow_html=True)

    # ── summary metrics ───────────────────────────────────────────────────────
    mc1, mc2, mc3, mc4 = st.columns(4)
    mc1.metric("Variants Generated", len(variants))
    mc2.metric("Passed ICIR Gate (≥1.0)", n_icir_pass)
    mc3.metric("Survived OOS Gate", n_survived)
    mc4.metric("Promoted", n_promoted)
    st.divider()

    # ── tabs ──────────────────────────────────────────────────────────────────
    tab_ov, tab_all, tab_diag, tab_log = st.tabs(
        ["📈 Overview", "📋 All Variants", "🔍 Diagnosis", "📜 Full Log"]
    )

    # ── TAB: Overview ─────────────────────────────────────────────────────────
    with tab_ov:
        col_chart, col_explain = st.columns([3, 2], gap="large")

        with col_chart:
            st.subheader("Equity Curve — Best Strategy vs. Benchmark")
            dates, strat_eq, bench_eq = generate_equity_curve()
            fig = go.Figure()
            fig.add_trace(go.Scatter(
                x=dates, y=strat_eq,
                name=best["name"],
                line=dict(color="#16a34a", width=2.5),
                fill="tozeroy", fillcolor="rgba(22,163,74,0.06)",
            ))
            fig.add_trace(go.Scatter(
                x=dates, y=bench_eq,
                name="Benchmark (SPY)",
                line=dict(color="#94a3b8", width=1.5, dash="dash"),
            ))
            fig.update_layout(
                height=300, margin=dict(l=0, r=0, t=8, b=0),
                legend=dict(orientation="h", y=1.12, x=0),
                yaxis_title="Portfolio Value ($)",
                hovermode="x unified",
                plot_bgcolor="white", paper_bgcolor="white",
                yaxis=dict(gridcolor="#f1f5f9", zeroline=False),
                xaxis=dict(gridcolor="#f1f5f9"),
            )
            st.plotly_chart(fig, use_container_width=True)

        with col_explain:
            st.subheader("What do these numbers mean?")
            st.markdown(f"""
**ICIR {best['icir']}** — The strategy's signal predicted returns *consistently* across the entire 2-year backtest period. Anything above 1.0 is considered reliable.

**Half-life {best['half_life']} days** — The signal stays predictive for ~18 days after firing. This is a near-perfect match for a swing-trading holding period.

**Sharpe {best['sharpe']}** — For every unit of risk taken, the strategy earned {best['sharpe']} units of return. Above 1.5 is considered very good for systematic strategies.

**OOS ICIR {best['oos_icir']}** — Near-identical to in-sample ({best['icir']}). This is the key test: performance held on data the strategy never trained on.
""")
            st.info(
                "💡 **Tip:** If OOS ICIR drops > 30% from in-sample, the strategy was "
                "probably overfit. This one dropped only 2.8% — very healthy."
            )

        st.divider()
        st.subheader("Actions")
        ac1, ac2, ac3 = st.columns(3)
        with ac1:
            if st.button("📄 Export Report", use_container_width=True):
                report_md = _build_report(st.session_state.idea, results)
                st.download_button(
                    "⬇️ Download Markdown report",
                    report_md,
                    file_name="loopquant_report.md",
                    mime="text/markdown",
                    use_container_width=True,
                )
        with ac2:
            if st.button("🔁 Run Again with Tweaks", use_container_width=True):
                st.session_state.phase = "input"
                st.rerun()
        with ac3:
            st.button("📊 Paper Trade This (coming soon)", use_container_width=True, disabled=True)

    # ── TAB: All Variants ─────────────────────────────────────────────────────
    with tab_all:
        st.subheader("All Variants — Ranked by ICIR")

        df = pd.DataFrame([
            {
                "Strategy": v["name"],
                "ICIR": v["icir"],
                "Half-life (days)": v["half_life"],
                "Sharpe": v["sharpe"],
                "2-Yr Return %": v["total_return"],
                "Max DD %": v["max_dd"],
                "OOS ICIR": v.get("oos_icir") or "—",
                "Status": v["status"],
            }
            for v in sorted(variants, key=lambda x: x["icir"], reverse=True)
        ])

        st.dataframe(
            df,
            use_container_width=True,
            hide_index=True,
            column_config={
                "ICIR":          st.column_config.NumberColumn(format="%.2f"),
                "Sharpe":        st.column_config.NumberColumn(format="%.2f"),
                "2-Yr Return %": st.column_config.NumberColumn(format="%.1f"),
                "Max DD %":      st.column_config.NumberColumn(format="%.1f"),
            },
        )

        st.caption(
            "**ICIR ≥ 1.0** is the minimum to advance to OOS testing. "
            "**OOS ICIR** is the definitive test — strategies that collapse here are rejected."
        )

    # ── TAB: Diagnosis ────────────────────────────────────────────────────────
    with tab_diag:
        # Rolling IC chart
        st.subheader("Rolling 20-Day IC — Best Strategy")
        dates_ic, rolling_ic = generate_rolling_ic()
        fig_ic = go.Figure()
        fig_ic.add_hline(y=0,    line_color="#e5e7eb", line_width=1.5)
        fig_ic.add_hline(y=0.05, line_color="#16a34a", line_dash="dot", line_width=1.2,
                         annotation_text="Target IC 0.05", annotation_position="right")
        fig_ic.add_trace(go.Scatter(
            x=dates_ic, y=rolling_ic,
            name="Rolling IC (20-day)",
            line=dict(color="#6366f1", width=2),
            fill="tozeroy", fillcolor="rgba(99,102,241,0.08)",
        ))
        fig_ic.update_layout(
            height=210, margin=dict(l=0, r=0, t=8, b=0),
            yaxis_title="IC",
            plot_bgcolor="white", paper_bgcolor="white",
            yaxis=dict(gridcolor="#f1f5f9"),
            xaxis=dict(gridcolor="#f1f5f9"),
        )
        st.plotly_chart(fig_ic, use_container_width=True)
        st.caption(
            "A rolling IC that stays consistently above the dashed line confirms the signal "
            "is reliably predictive across different market regimes — not just lucky in one period."
        )
        st.divider()

        st.subheader("Strategy-by-Strategy Breakdown")
        for v in variants:
            passed = "❌" not in v["status"]
            label = f"{'✅' if passed else '❌'}  {v['name']}  ·  ICIR {v['icir']}  ·  {v['status']}"
            with st.expander(label, expanded=(v["name"] == best["name"])):
                d1, d2 = st.columns([3, 2], gap="large")
                with d1:
                    st.markdown(f"**Strategy:** {v['description']}")
                    if passed:
                        st.markdown(f"**Why it worked:** {v.get('why_worked', '')}")
                        st.markdown("**Key strengths:**")
                        for s in v.get("strengths", []):
                            st.markdown(f"  ✓ {s}")
                    else:
                        st.markdown(f"**Why it was rejected:** {v.get('why_failed', '')}")
                        st.markdown("**Key issues:**")
                        for w in v.get("weaknesses", []):
                            st.markdown(f"  ✗ {w}")
                with d2:
                    r1, r2 = st.columns(2)
                    r1.metric("ICIR", v["icir"])
                    r2.metric("Half-life", f"{v['half_life']}d")
                    r1.metric("Sharpe", v["sharpe"])
                    r2.metric("Max DD", f"{v['max_dd']}%")
                    if v.get("oos_icir"):
                        oos_delta = round(v["oos_icir"] - v["icir"], 2)
                        st.metric("OOS ICIR", v["oos_icir"],
                                  delta=f"{oos_delta:+.2f} vs in-sample",
                                  delta_color="normal")

    # ── TAB: Full Log ─────────────────────────────────────────────────────────
    with tab_log:
        st.subheader("Complete Audit Trail")
        st.caption(
            "Every decision made during the loop, in order — fully transparent. "
            "Nothing is hidden."
        )

        for entry in AUDIT_LOG:
            lc1, lc2 = st.columns([1, 7])
            lc1.caption(f"`{entry['time']}`")
            lc1.caption(f"*{entry['step']}*")
            lc2.markdown(entry["message"])

        st.divider()
        log_md = _build_log_md()
        st.download_button(
            "⬇️ Download full log as Markdown",
            log_md,
            file_name="loopquant_audit_log.md",
            mime="text/markdown",
        )


# ═══════════════════════════════════════════════════════════════════════════════
#  HELPERS
# ═══════════════════════════════════════════════════════════════════════════════
def _build_report(idea: str, results: dict) -> str:
    best = results["best"]
    variants = results["variants"]
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    rows = "\n".join(
        f"| {v['name']} | {v['icir']} | {v['sharpe']} | {v.get('oos_icir') or '—'} | {v['status']} |"
        for v in sorted(variants, key=lambda x: x["icir"], reverse=True)
    )
    return f"""# LoopQuant Strategy Report
**Generated:** {now}
**Idea:** {idea}

---

## Best Strategy: {best['name']}
{best['description']}

| Metric | Value |
|--------|-------|
| ICIR (in-sample) | {best['icir']} |
| OOS ICIR | {best.get('oos_icir', 'N/A')} |
| Sharpe | {best['sharpe']} |
| Half-life | {best['half_life']} days |
| 2-Year Return | +{best['total_return']}% |
| Max Drawdown | {best['max_dd']}% |

**Why it worked:** {best.get('why_worked', '')}

---

## All Variants

| Strategy | ICIR | Sharpe | OOS ICIR | Status |
|----------|------|--------|----------|--------|
{rows}

---

*Generated by LoopQuant · Educational/research use only · Not financial advice.*
"""


def _build_log_md() -> str:
    lines = ["# LoopQuant Audit Log\n"]
    for e in AUDIT_LOG:
        lines.append(f"**`{e['time']}`** · *{e['step']}* — {e['message']}\n")
    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════════════════
#  ROUTER
# ═══════════════════════════════════════════════════════════════════════════════
if st.session_state.phase == "input":
    show_input()
elif st.session_state.phase == "running":
    show_running()
elif st.session_state.phase == "results":
    show_results()
