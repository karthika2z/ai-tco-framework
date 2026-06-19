"""
Pandas vectorized backtester.
Interprets StrategySpec signal types into concrete buy/sell logic.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from data_providers import DataProvider
from models import BacktestResult, ExitType, FilterType, SignalType, StrategySpec


# ── Indicator helpers ──────────────────────────────────────────────────────────

def _sma(s: pd.Series, n: int) -> pd.Series:
    return s.rolling(int(n)).mean()

def _ema(s: pd.Series, n: int) -> pd.Series:
    return s.ewm(span=int(n), adjust=False).mean()

def _rsi(s: pd.Series, n: int = 14) -> pd.Series:
    delta = s.diff()
    gain = delta.clip(lower=0).rolling(int(n)).mean()
    loss = (-delta.clip(upper=0)).rolling(int(n)).mean()
    rs = gain / loss.replace(0, np.nan)
    return 100 - 100 / (1 + rs)

def _atr(df: pd.DataFrame, n: int = 14) -> pd.Series:
    hl = df["High"] - df["Low"]
    hc = (df["High"] - df["Close"].shift()).abs()
    lc = (df["Low"] - df["Close"].shift()).abs()
    tr = pd.concat([hl, hc, lc], axis=1).max(axis=1)
    return tr.rolling(int(n)).mean()

def _bollinger(s: pd.Series, n: int = 20, k: float = 2.0):
    mid  = _sma(s, n)
    std  = s.rolling(int(n)).std()
    upper = mid + k * std
    lower = mid - k * std
    return upper, mid, lower

def _macd(s: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9):
    macd_line   = _ema(s, fast) - _ema(s, slow)
    signal_line = _ema(macd_line, signal)
    return macd_line, signal_line


# ── Signal computation ─────────────────────────────────────────────────────────

def _entry_signal(spec: StrategySpec, df: pd.DataFrame) -> tuple[pd.Series, pd.Series]:
    """
    Returns (entry_bool, factor_strength) both indexed like df.
    entry_bool: True on the bar when the signal fires (trade next bar).
    factor_strength: continuous signal value for IC calculation.
    """
    close  = df["Close"]
    p      = spec.entry_signal.params
    st     = spec.entry_signal.signal_type

    if st == SignalType.SMA_CROSS:
        fast_n = int(p.get("fast", 50))
        slow_n = int(p.get("slow", 200))
        fast = _sma(close, fast_n)
        slow = _sma(close, slow_n)
        factor = (fast - slow) / slow.replace(0, np.nan)
        cross_up = (fast > slow) & (fast.shift() <= slow.shift())
        return cross_up, factor

    if st == SignalType.RSI_THRESHOLD:
        period    = int(p.get("period", 14))
        threshold = p.get("threshold", 30.0)
        rsi = _rsi(close, period)
        factor = -(rsi - 50) / 50          # lower RSI → higher expected return
        entry = (rsi < threshold) & (rsi.shift() >= threshold)
        return entry, factor

    if st == SignalType.MACD_SIGNAL:
        macd_line, signal_line = _macd(
            close,
            int(p.get("fast", 12)),
            int(p.get("slow", 26)),
            int(p.get("signal", 9)),
        )
        factor = macd_line - signal_line
        cross_up = (macd_line > signal_line) & (macd_line.shift() <= signal_line.shift())
        return cross_up, factor

    if st == SignalType.BB_MEAN_REV:
        n = int(p.get("period", 20))
        k = p.get("std_dev", 2.0)
        upper, mid, lower = _bollinger(close, n, k)
        bw = (upper - lower).replace(0, np.nan)
        factor = -(close - mid) / bw       # below mid → positive factor
        entry = (close < lower) & (close.shift() >= lower.shift())
        return entry, factor

    if st == SignalType.PRICE_BREAKOUT:
        n = int(p.get("lookback", 20))
        rolling_high = close.shift(1).rolling(n).max()
        factor = (close - rolling_high) / rolling_high.replace(0, np.nan)
        entry = close > rolling_high
        return entry, factor

    if st == SignalType.MEAN_REVERSION:
        n  = int(p.get("period", 20))
        sd = p.get("std_dev", 2.0)
        sma = _sma(close, n)
        std = close.rolling(n).std()
        zscore = (close - sma) / std.replace(0, np.nan)
        factor = -zscore                   # very negative z → strong buy signal
        entry = zscore < -sd
        return entry, factor

    # Fallback: never fire
    return pd.Series(False, index=df.index), pd.Series(0.0, index=df.index)


def _apply_filters(spec: StrategySpec, df: pd.DataFrame, entry: pd.Series) -> pd.Series:
    close = df["Close"]

    for f in spec.filters:
        if f == FilterType.TREND_FILTER:
            ma200 = _sma(close, 200)
            entry = entry & (close > ma200)

        elif f == FilterType.VOLATILITY_FILTER:
            atr = _atr(df)
            median_atr = atr.expanding().median()
            entry = entry & (atr < median_atr)

        elif f == FilterType.VOLUME_FILTER:
            vol_ma = df["Volume"].rolling(20).mean()
            entry = entry & (df["Volume"] > 1.5 * vol_ma)

    return entry


# ── Core backtest loop ─────────────────────────────────────────────────────────

def _build_positions(
    entry: pd.Series,
    exit_spec,
    close: pd.Series,
    max_hold: int,
) -> pd.Series:
    """
    Simple day-by-day position builder (avoids look-ahead bias via shift(1)).
    Returns a Series of {0, 1} — 1 means long that day.
    """
    n = len(close)
    entry_arr = entry.shift(1).fillna(False).values
    close_arr = close.values

    positions = np.zeros(n, dtype=float)
    in_trade   = False
    entry_price = 0.0
    days_held   = 0

    et  = exit_spec.exit_type
    ep  = exit_spec.params

    for i in range(1, n):
        if not in_trade:
            if entry_arr[i]:
                in_trade    = True
                entry_price = close_arr[i]
                days_held   = 0
                positions[i] = 1.0
        else:
            days_held += 1
            pnl_pct = (close_arr[i] - entry_price) / entry_price

            exit_now = False
            if et == ExitType.TIME_BASED and days_held >= int(ep.get("days", max_hold)):
                exit_now = True
            elif et == ExitType.STOP_LOSS and pnl_pct <= -ep.get("pct", 0.07):
                exit_now = True
            elif et == ExitType.PROFIT_TARGET and pnl_pct >= ep.get("pct", 0.10):
                exit_now = True

            if exit_now or days_held >= max_hold:
                in_trade = False
                days_held = 0
            else:
                positions[i] = 1.0

    return pd.Series(positions, index=close.index)


def run_backtest(
    spec: StrategySpec,
    df: pd.DataFrame,
    holding_days: int = 5,
) -> BacktestResult:
    """
    Run a full vectorized backtest for one StrategySpec on OHLCV data.
    """
    close = df["Close"]
    daily_rets = close.pct_change().fillna(0.0)

    entry_raw, factor = _entry_signal(spec, df)
    entry_filtered  = _apply_filters(spec, df, entry_raw)
    positions = _build_positions(entry_filtered, spec.exit_signal, close, holding_days)

    strat_rets  = positions * daily_rets
    equity      = 100.0 * (1 + strat_rets).cumprod()

    # ── compute summary stats ──────────────────────────────────────────────────
    n_trades = int((positions.diff() == 1).sum())
    if n_trades == 0:
        # Strategy never fired — return flat results
        return BacktestResult(
            strategy_name=spec.name,
            total_return_pct=0.0,
            sharpe_ratio=0.0,
            max_drawdown_pct=0.0,
            n_trades=0,
            win_rate_pct=0.0,
            equity_curve=equity.tolist(),
            dates=[d.strftime("%Y-%m-%d") for d in df.index],
            daily_returns=strat_rets.tolist(),
            factor_series=factor.fillna(0).tolist(),
        )

    # Trade-level win rate
    trade_rets: list[float] = []
    in_t = False
    entry_p = 0.0
    for i, (pos, price) in enumerate(zip(positions.values, close.values)):
        if not in_t and pos == 1.0:
            in_t    = True
            entry_p = price
        elif in_t and pos == 0.0:
            trade_rets.append((price - entry_p) / entry_p)
            in_t = False
    win_rate = 100.0 * sum(r > 0 for r in trade_rets) / len(trade_rets) if trade_rets else 0.0

    total_ret = float(equity.iloc[-1] - 100.0)
    peak = equity.cummax()
    max_dd = float(((equity - peak) / peak).min() * 100)

    # Annualised Sharpe
    excess = strat_rets - 0.0 / 252
    sharpe = float(excess.mean() / excess.std() * np.sqrt(252)) if excess.std() > 1e-10 else 0.0

    return BacktestResult(
        strategy_name=spec.name,
        total_return_pct=round(total_ret, 2),
        sharpe_ratio=round(sharpe, 3),
        max_drawdown_pct=round(max_dd, 2),
        n_trades=n_trades,
        win_rate_pct=round(win_rate, 1),
        equity_curve=[round(v, 4) for v in equity.tolist()],
        dates=[d.strftime("%Y-%m-%d") for d in df.index],
        daily_returns=[round(v, 6) for v in strat_rets.tolist()],
        factor_series=[round(v, 6) for v in factor.fillna(0).tolist()],
    )
