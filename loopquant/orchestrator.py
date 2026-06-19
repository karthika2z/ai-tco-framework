"""
Loop orchestrator: wires together all Phase 1 components.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Callable, Optional

from backtester import run_backtest
from critic import diagnose
from data_providers import make_provider
from generator import generate_variants, _holding_days
from metrics import compute_full_report
from models import LoopState, MetricsReport, OOSResult, RunConfig, StrategySpec

logger = logging.getLogger(__name__)

StatusCallback = Callable[[int, str, str], None]   # (step, title, detail)


def _log(state: LoopState, step: str, message: str) -> None:
    ts = datetime.now().strftime("%H:%M:%S")
    state.audit_log.append({"time": ts, "step": step, "message": message})
    logger.info("[%s] %s — %s", ts, step, message)


def _date_range(timeframe: str) -> tuple[str, str]:
    end = datetime.now()
    years_map = {
        "Last 1 Year": 1, "Last 2 Years": 2,
        "Last 3 Years": 3, "Last 5 Years": 5,
    }
    years = years_map.get(timeframe, 2)
    start = end - timedelta(days=int(years * 365.25))
    return start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d")


def _symbol(universe: str) -> str:
    if "crypto" in universe.lower():
        return "BTC-USD"
    return "SPY"


def _oos_split(dates: list[str], oos_pct: float) -> tuple[int, int]:
    """Returns (is_cutoff_idx, oos_start_idx) for the date list."""
    n = len(dates)
    cutoff = int(n * (1 - oos_pct))
    return cutoff


def run_loop(
    idea: str,
    universe: str,
    holding_period: str,
    timeframe: str,
    config: RunConfig,
    on_step: Optional[StatusCallback] = None,
) -> LoopState:
    """
    Full Phase 1 loop. Returns a LoopState with all results populated.
    on_step(step_num, title, detail) called at each progress point.
    """
    state = LoopState(
        idea=idea,
        universe=universe,
        holding_period=holding_period,
        timeframe=timeframe,
    )
    _log(state, "Init", f"Loop started. Universe: {universe}. Period: {holding_period}. Window: {timeframe}.")

    symbol  = _symbol(universe)
    provider = make_provider(config.data_source)
    start, end = _date_range(timeframe)
    holding_days = _holding_days(holding_period)

    # ── Step 1: Generate ─────────────────────────────────────────────────────
    if on_step: on_step(1, "Generating strategy variants", f"Asking Claude to design {config.n_variants} variants…")
    _log(state, "Generator", f"Sending idea to Claude. Requesting {config.n_variants} variants.")
    try:
        result = generate_variants(idea, universe, holding_period, config)
        state.variants = result.variants
        _log(state, "Generator", f"Received {len(state.variants)} variants: {[v.name for v in state.variants]}")
    except Exception as exc:
        state.errors.append(str(exc))
        _log(state, "Generator", f"FAILED: {exc}. Returning empty state.")
        return state

    # ── Step 2: Fetch data ────────────────────────────────────────────────────
    if on_step: on_step(2, "Fetching historical data", f"Downloading {symbol} data ({timeframe})…")
    _log(state, "Data", f"Fetching {symbol} from {start} to {end} via {config.data_source}.")
    try:
        df_full = provider.get_ohlcv(symbol, start, end)
        _log(state, "Data", f"Loaded {len(df_full)} trading days.")
    except Exception as exc:
        state.errors.append(f"Data fetch failed: {exc}. Falling back to mock data.")
        _log(state, "Data", f"yfinance failed ({exc}). Falling back to MockDataProvider.")
        from data_providers import MockDataProvider
        df_full = MockDataProvider().get_ohlcv(symbol, start, end)

    # ── In-sample / OOS split ─────────────────────────────────────────────────
    cutoff_idx = _oos_split(list(df_full.index), config.oos_split_pct)
    df_is  = df_full.iloc[:cutoff_idx]   # in-sample (training)
    df_oos = df_full.iloc[cutoff_idx:]   # out-of-sample (held out)
    _log(state, "Data", f"IS: {len(df_is)} days, OOS: {len(df_oos)} days ({int(config.oos_split_pct*100)}% holdout).")

    # ── Step 3: Backtest ──────────────────────────────────────────────────────
    if on_step: on_step(3, "Backtesting all variants", f"Running {len(state.variants)} strategies on {len(df_is)} days of data…")
    for i, spec in enumerate(state.variants):
        _log(state, "Backtester", f"Running IS backtest {i+1}/{len(state.variants)}: {spec.name}")
        try:
            bt = run_backtest(spec, df_is, holding_days)
            state.backtest_results.append(bt)
            _log(state, "Backtester", f"{spec.name}: Return={bt.total_return_pct:+.1f}%, Sharpe={bt.sharpe_ratio:.2f}, Trades={bt.n_trades}")
        except Exception as exc:
            state.errors.append(f"Backtest failed for {spec.name}: {exc}")
            _log(state, "Backtester", f"SKIPPED {spec.name}: {exc}")

    if not state.backtest_results:
        _log(state, "Backtester", "No backtests succeeded. Aborting loop.")
        return state

    # ── Step 4: Score ─────────────────────────────────────────────────────────
    if on_step: on_step(4, "Scoring — IC, ICIR & Half-life", "Computing signal quality metrics…")
    for bt in state.backtest_results:
        m = compute_full_report(bt, config, holding_days)
        state.metrics.append(m)
        _log(state, "Metrics",
             f"{m.strategy_name}: ICIR={m.icir:.2f}, HL={m.half_life_days:.0f}d, "
             f"Sharpe={m.sharpe:.2f} | ICIR-gate={'PASS' if m.passed_icir_gate else 'FAIL'} "
             f"HL-gate={'PASS' if m.passed_halflife_gate else 'FAIL'}")

    # ── Step 5: Diagnose ──────────────────────────────────────────────────────
    if on_step: on_step(5, "Diagnosing results", "Claude is analysing what worked and what failed…")
    _log(state, "Critic", "Sending all metrics to Claude critic for diagnosis.")
    batch = diagnose(state.variants, state.metrics, config)
    state.diagnoses = batch.diagnoses
    _log(state, "Critic", f"Received {len(state.diagnoses)} diagnoses.")

    # ── Step 6: OOS Gate ──────────────────────────────────────────────────────
    candidates = [m for m in state.metrics if m.passed_icir_gate and m.passed_halflife_gate]
    if on_step: on_step(6, "Out-of-Sample Gate",
                        f"Re-testing {len(candidates)} survivor(s) on {len(df_oos)} unseen days…")
    _log(state, "OOS Gate", f"{len(candidates)} variant(s) passed IS gates. Testing on OOS data.")

    for m in candidates:
        spec = next((s for s in state.variants if s.name == m.strategy_name), None)
        if not spec:
            continue
        try:
            bt_oos = run_backtest(spec, df_oos, holding_days)
            m_oos  = compute_full_report(bt_oos, config, holding_days)
            oos_r  = OOSResult(
                strategy_name=spec.name,
                oos_icir=m_oos.icir,
                oos_sharpe=m_oos.sharpe,
                oos_total_return_pct=m_oos.total_return_pct,
                passed=m_oos.icir >= config.min_icir,
            )
            state.oos_results.append(oos_r)
            verdict = "PASSED ✅" if oos_r.passed else "FAILED ❌"
            _log(state, "OOS Gate",
                 f"{spec.name}: OOS ICIR={m_oos.icir:.2f} → {verdict}")
            if oos_r.passed:
                state.survivors.append(spec.name)
        except Exception as exc:
            state.errors.append(f"OOS test failed for {spec.name}: {exc}")
            _log(state, "OOS Gate", f"OOS test SKIPPED for {spec.name}: {exc}")

    # ── Promote ───────────────────────────────────────────────────────────────
    if state.survivors:
        best_oos = max(
            [r for r in state.oos_results if r.strategy_name in state.survivors],
            key=lambda r: r.oos_icir,
        )
        state.promoted = best_oos.strategy_name
        _log(state, "Promoter", f"Promoted: {state.promoted} (OOS ICIR={best_oos.oos_icir:.2f})")
    else:
        _log(state, "Promoter", "No survivors. No strategy promoted.")

    _log(state, "Complete",
         f"Loop finished. {len(state.variants)} generated → "
         f"{len(candidates)} passed IS → {len(state.survivors)} survived OOS → "
         f"{'1 promoted' if state.promoted else '0 promoted'}.")

    return state
