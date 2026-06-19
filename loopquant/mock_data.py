"""
Hardcoded mock data for the Phase 0 UI mockup.
Replace with real engine outputs in Phase 1.
"""

import numpy as np
import pandas as pd
from datetime import datetime

np.random.seed(42)

MOCK_VARIANTS = [
    {
        "name": "Volatility-Filtered MA Crossover",
        "description": "50/200 MA crossover with ATR volatility filter. Only trades when 20-day ATR is below its 6-month median.",
        "icir": 1.42,
        "ic": 0.08,
        "half_life": 18,
        "sharpe": 1.61,
        "max_dd": -8.3,
        "total_return": 34.2,
        "status": "✅ Promoted",
        "oos_icir": 1.38,
        "why_worked": (
            "Strong signal consistency. The volatility filter effectively avoided choppy "
            "markets. A half-life of 18 days aligns well with the intended swing trading "
            "timeframe. OOS ICIR held at 97% of in-sample — very low overfitting."
        ),
        "strengths": [
            "ICIR consistent across all sub-periods tested",
            "Volatility filter cuts false signals during choppy markets",
            "Half-life matches the intended holding period",
            "OOS ICIR only 2.8% below in-sample (minimal overfitting)",
        ],
    },
    {
        "name": "RSI Mean Reversion + Volume Confirm",
        "description": "Buy on RSI < 30 with above-average volume. Exit on RSI > 65 or after 8 days, whichever comes first.",
        "icir": 1.19,
        "ic": 0.06,
        "half_life": 12,
        "sharpe": 1.28,
        "max_dd": -12.1,
        "total_return": 22.8,
        "status": "✅ Survived OOS",
        "oos_icir": 1.09,
        "why_worked": (
            "Mean reversion logic is sound. Volume confirmation filters out weak reversals. "
            "ICIR of 1.19 meets the threshold. OOS performance dropped ~8% — acceptable, "
            "though the primary strategy is preferred."
        ),
        "strengths": [
            "Volume confirmation adds real edge over raw RSI",
            "Mean reversion is robust in range-bound markets",
            "Short holding cap (8 days) limits overnight risk",
        ],
    },
    {
        "name": "Momentum Breakout + Trend Filter",
        "description": "Buy on 20-day high breakout when price is above the 200-day MA. Trailing 5% stop-loss exit.",
        "icir": 0.71,
        "ic": 0.04,
        "half_life": 7,
        "sharpe": 0.82,
        "max_dd": -19.4,
        "total_return": 11.3,
        "status": "❌ Rejected OOS",
        "oos_icir": 0.44,
        "why_failed": (
            "Half-life of 7 days signals the edge decays too fast. ICIR collapsed 38% on "
            "OOS data — a classic sign of overfitting to a specific momentum regime. "
            "Likely needs a regime filter to be viable."
        ),
        "weaknesses": [
            "Half-life (7 days) below the 10-day minimum threshold",
            "ICIR dropped 38% in OOS: 0.71 → 0.44",
            "Momentum factors are crowded and regime-dependent",
        ],
    },
    {
        "name": "Earnings Surprise + Sector Rotation",
        "description": "Buy stocks with positive earnings surprise in outperforming sectors. Hold 3–4 weeks.",
        "icir": 0.43,
        "ic": 0.03,
        "half_life": 4,
        "sharpe": 0.51,
        "max_dd": -24.7,
        "total_return": 6.1,
        "status": "❌ Rejected (Low ICIR)",
        "oos_icir": None,
        "why_failed": (
            "ICIR of 0.43 is far below the 1.0 minimum — did not advance to OOS testing. "
            "The earnings surprise factor is well-documented and has been largely arbitraged "
            "away. The signal half-life of 4 days is also too short for a 3–4 week hold."
        ),
        "weaknesses": [
            "ICIR (0.43) far below 1.0 minimum — did not reach OOS",
            "Crowded factor with sharply declining alpha since 2018",
            "Half-life (4 days) mismatched to 3-4 week holding period",
        ],
    },
]


def generate_equity_curve():
    n = 504  # ~2 trading years
    dates = pd.bdate_range(end=datetime.now(), periods=n)

    strat_r = np.random.normal(0.0009, 0.010, n)
    bench_r = np.random.normal(0.0004, 0.011, n)

    # Sprinkle in a few bad patches for realism
    bad = np.random.choice(n, 18, replace=False)
    strat_r[bad] -= np.random.uniform(0.01, 0.025, 18)

    strat_eq = 100 * np.cumprod(1 + strat_r)
    bench_eq = 100 * np.cumprod(1 + bench_r)
    return dates, strat_eq, bench_eq


def generate_rolling_ic():
    n = 504
    dates = pd.bdate_range(end=datetime.now(), periods=n)
    raw = np.random.normal(0.065, 0.04, n)
    rolling = pd.Series(raw).rolling(20).mean().values
    return dates, rolling


AUDIT_LOG = [
    {"time": "00:00:00", "step": "Init",       "message": "Loop started. Idea received. Universe: Stocks (US Equities). Holding period: Swing (2–10 days). Backtest window: Last 2 Years."},
    {"time": "00:00:01", "step": "Generator",  "message": "Sending idea to AI (Claude). Requesting 4 structured strategy variants with entry rules, exit rules, position sizing, and filters."},
    {"time": "00:00:03", "step": "Generator",  "message": "✓ Received 4 variants: (1) Volatility-Filtered MA Crossover, (2) RSI Mean Reversion, (3) Momentum Breakout, (4) Earnings Surprise."},
    {"time": "00:00:04", "step": "Backtester", "message": "Starting in-sample backtest for Variant 1/4. Data range: 2022-01-01 → 2023-12-31 (504 trading days)."},
    {"time": "00:00:06", "step": "Backtester", "message": "Variant 1 complete. Return: +34.2%, Sharpe: 1.61, Max DD: -8.3%. 187 trades executed."},
    {"time": "00:00:06", "step": "Backtester", "message": "Starting backtest for Variant 2/4: RSI Mean Reversion + Volume."},
    {"time": "00:00:08", "step": "Backtester", "message": "Variant 2 complete. Return: +22.8%, Sharpe: 1.28, Max DD: -12.1%. 214 trades."},
    {"time": "00:00:08", "step": "Backtester", "message": "Starting backtest for Variant 3/4: Momentum Breakout + Trend Filter."},
    {"time": "00:00:10", "step": "Backtester", "message": "Variant 3 complete. Return: +11.3%, Sharpe: 0.82, Max DD: -19.4%. 98 trades."},
    {"time": "00:00:10", "step": "Backtester", "message": "Starting backtest for Variant 4/4: Earnings Surprise + Sector Rotation."},
    {"time": "00:00:12", "step": "Backtester", "message": "Variant 4 complete. Return: +6.1%, Sharpe: 0.51, Max DD: -24.7%. 62 trades."},
    {"time": "00:00:12", "step": "Metrics",    "message": "Computing IC, ICIR, and half-life for all 4 variants using Spearman rank correlation and AR(1) decay model."},
    {"time": "00:00:13", "step": "Metrics",    "message": "Results → Variant 1: ICIR=1.42, HL=18d | Variant 2: ICIR=1.19, HL=12d | Variant 3: ICIR=0.71, HL=7d | Variant 4: ICIR=0.43, HL=4d."},
    {"time": "00:00:13", "step": "ICIR Gate",  "message": "Applying minimum ICIR threshold: 1.0. Variants 3 (0.71) and 4 (0.43) eliminated. Variants 1 and 2 advance."},
    {"time": "00:00:13", "step": "Critic",     "message": "Sending all 4 variants to AI critic for structured diagnosis — identifying what worked and what failed."},
    {"time": "00:00:15", "step": "Critic",     "message": "Diagnosis complete. Key finding: volatility filter is the primary differentiator. Half-life < 10 days correlated with OOS failure."},
    {"time": "00:00:15", "step": "OOS Gate",   "message": "Beginning out-of-sample test on Variants 1 and 2. Held-out data: 2024-01-01 → 2024-06-01. This data was never seen during development."},
    {"time": "00:00:17", "step": "OOS Gate",   "message": "Variant 1 OOS ICIR: 1.38 (threshold: ≥1.0). PASSED ✅. In-sample drop: 2.8% — excellent."},
    {"time": "00:00:18", "step": "OOS Gate",   "message": "Variant 2 OOS ICIR: 1.09 (threshold: ≥1.0). PASSED ✅. In-sample drop: 8.4% — acceptable."},
    {"time": "00:00:18", "step": "Promoter",   "message": "2 strategies survived all gates. Promoting Variant 1 as primary recommendation based on highest OOS ICIR (1.38)."},
    {"time": "00:00:19", "step": "Complete",   "message": "Loop finished. 4 variants generated → 2 passed ICIR gate → 2 passed OOS gate → 1 promoted. Total wall time: 19s (mock). Production: ~2–5 min."},
]


def get_mock_results():
    return {
        "best": MOCK_VARIANTS[0],
        "variants": MOCK_VARIANTS,
    }
