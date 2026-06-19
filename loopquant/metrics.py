"""
Quantitative metrics: IC, ICIR, half-life, and the full metrics report.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from scipy import stats

from models import BacktestResult, MetricsReport, RunConfig


def _spearman_ic(factor: np.ndarray, fwd_return: np.ndarray) -> float:
    """Spearman rank correlation, handling NaNs."""
    mask = ~(np.isnan(factor) | np.isnan(fwd_return))
    if mask.sum() < 5:
        return float("nan")
    r, _ = stats.spearmanr(factor[mask], fwd_return[mask])
    return float(r) if not np.isnan(r) else float("nan")


def calculate_ic_series(
    factor_series: list[float],
    daily_returns: list[float],
    holding_days: int = 5,
    window: int = 60,
) -> list[float]:
    """
    Rolling IC: for each window of `window` days, compute Spearman IC
    between the factor and the forward `holding_days`-day return.
    Returns a list of IC values (one per window).
    """
    factor = np.array(factor_series)
    rets = np.array(daily_returns)

    # Forward return over holding_days
    n = len(rets)
    fwd_rets = np.full(n, np.nan)
    for i in range(n - holding_days):
        fwd_rets[i] = np.sum(rets[i + 1 : i + 1 + holding_days])

    ics: list[float] = []
    step = max(1, holding_days)
    for start in range(0, n - window, step):
        end = start + window
        ic = _spearman_ic(factor[start:end], fwd_rets[start:end])
        if not np.isnan(ic):
            ics.append(ic)

    return ics if ics else [0.0]


def calculate_icir(ic_series: list[float]) -> float:
    arr = np.array(ic_series)
    arr = arr[~np.isnan(arr)]
    if len(arr) < 3 or np.std(arr) < 1e-10:
        return 0.0
    return float(np.mean(arr) / np.std(arr))


def calculate_half_life(daily_returns: list[float]) -> float:
    """
    AR(1) half-life of the return autocorrelation.
    Half-life = -ln(2) / ln(|AR1 coefficient|).
    """
    r = np.array(daily_returns, dtype=float)
    r = r[~np.isnan(r)]
    if len(r) < 20:
        return 999.0
    # Strategy never traded — flat returns have undefined half-life
    if np.std(r) < 1e-10:
        return 999.0
    try:
        slope, _, _, _, _ = stats.linregress(r[:-1], r[1:])
    except Exception:
        return 999.0
    slope = float(np.clip(slope, -0.9999, 0.9999))
    if abs(slope) < 1e-6:
        return 1.0
    hl = -np.log(2) / np.log(abs(slope))
    return float(np.clip(hl, 1.0, 500.0))


def compute_sharpe(daily_returns: list[float], risk_free: float = 0.0) -> float:
    r = np.array(daily_returns)
    r = r[~np.isnan(r)]
    if len(r) < 5 or np.std(r) < 1e-10:
        return 0.0
    excess = r - risk_free / 252
    return float(np.mean(excess) / np.std(excess) * np.sqrt(252))


def compute_max_drawdown(equity_curve: list[float]) -> float:
    eq = np.array(equity_curve)
    if len(eq) == 0:
        return 0.0
    peak = np.maximum.accumulate(eq)
    dd = (eq - peak) / peak
    return float(dd.min() * 100)


def compute_full_report(
    result: BacktestResult,
    config: RunConfig,
    holding_days: int = 5,
) -> MetricsReport:
    ics = calculate_ic_series(
        result.factor_series, result.daily_returns, holding_days=holding_days
    )
    ic_mean = float(np.mean(ics))
    icir = calculate_icir(ics)
    hl = calculate_half_life(result.daily_returns)

    return MetricsReport(
        strategy_name=result.strategy_name,
        ic=round(ic_mean, 4),
        icir=round(icir, 4),
        half_life_days=round(hl, 1),
        sharpe=round(result.sharpe_ratio, 2),
        total_return_pct=round(result.total_return_pct, 2),
        max_drawdown_pct=round(result.max_drawdown_pct, 2),
        n_trades=result.n_trades,
        win_rate_pct=round(result.win_rate_pct, 1),
        passed_icir_gate=icir >= config.min_icir,
        passed_halflife_gate=hl >= config.min_half_life_days,
    )
