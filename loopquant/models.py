"""
Pydantic models for the entire LoopQuant engine.
"""

from __future__ import annotations

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


# ── Enums ─────────────────────────────────────────────────────────────────────

class SignalType(str, Enum):
    SMA_CROSS       = "SMA_CROSS"       # fast SMA crosses above slow SMA
    RSI_THRESHOLD   = "RSI_THRESHOLD"   # RSI below threshold (oversold)
    MACD_SIGNAL     = "MACD_SIGNAL"     # MACD line crosses signal line up
    BB_MEAN_REV     = "BB_MEAN_REV"     # price dips below lower Bollinger band
    PRICE_BREAKOUT  = "PRICE_BREAKOUT"  # price makes new N-day high
    MEAN_REVERSION  = "MEAN_REVERSION"  # price > N std-devs below its SMA


class ExitType(str, Enum):
    TIME_BASED     = "TIME_BASED"      # exit after N days
    STOP_LOSS      = "STOP_LOSS"       # exit if return < -pct
    PROFIT_TARGET  = "PROFIT_TARGET"   # exit if return > pct
    REVERSAL       = "REVERSAL"        # exit when entry signal reverses


class FilterType(str, Enum):
    TREND_FILTER      = "trend_filter"      # only trade when price > 200-day MA
    VOLATILITY_FILTER = "volatility_filter" # only trade when ATR < median ATR
    VOLUME_FILTER     = "volume_filter"     # only trade on above-avg volume


# ── Strategy Spec ─────────────────────────────────────────────────────────────

class EntrySignal(BaseModel):
    signal_type: SignalType
    params: dict[str, float] = Field(
        description="Signal parameters, e.g. {fast: 50, slow: 200} for SMA_CROSS"
    )
    description: str = Field(description="One-sentence plain-English description")


class ExitSignal(BaseModel):
    exit_type: ExitType
    params: dict[str, float] = Field(
        description="Exit parameters, e.g. {days: 10} or {pct: 0.07}"
    )
    description: str


class StrategySpec(BaseModel):
    name: str = Field(description="Short descriptive name, 4–7 words")
    description: str = Field(description="Plain-English description, 1–2 sentences")
    entry_signal: EntrySignal
    exit_signal: ExitSignal
    filters: list[FilterType] = Field(
        default_factory=list,
        description="Optional filters to apply before entering"
    )


class StrategyVariants(BaseModel):
    """Wrapper so instructor returns a list of variants."""
    variants: list[StrategySpec]


# ── Backtest & Metrics ────────────────────────────────────────────────────────

class BacktestResult(BaseModel):
    strategy_name: str
    total_return_pct: float
    sharpe_ratio: float
    max_drawdown_pct: float
    n_trades: int
    win_rate_pct: float
    equity_curve: list[float]       # dollar values starting at 100
    dates: list[str]                # ISO date strings
    daily_returns: list[float]      # raw daily return series
    factor_series: list[float]      # signal strength at each day (for IC)


class MetricsReport(BaseModel):
    strategy_name: str
    ic: float                       # mean Spearman IC
    icir: float                     # IC / std(IC)
    half_life_days: float           # AR(1) signal decay half-life
    sharpe: float
    total_return_pct: float
    max_drawdown_pct: float
    n_trades: int
    win_rate_pct: float
    passed_icir_gate: bool          # icir >= min_icir
    passed_halflife_gate: bool      # half_life_days >= min_half_life


class OOSResult(BaseModel):
    strategy_name: str
    oos_icir: float
    oos_sharpe: float
    oos_total_return_pct: float
    passed: bool


# ── Diagnosis ─────────────────────────────────────────────────────────────────

class Diagnosis(BaseModel):
    strategy_name: str
    verdict: str    # "promising" | "rejected"
    summary: str    # 2–3 sentence plain-English verdict
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)


class DiagnosisBatch(BaseModel):
    diagnoses: list[Diagnosis]


# ── Loop State & Report ───────────────────────────────────────────────────────

class LoopState(BaseModel):
    idea: str
    universe: str
    holding_period: str
    timeframe: str

    variants: list[StrategySpec] = Field(default_factory=list)
    backtest_results: list[BacktestResult] = Field(default_factory=list)
    metrics: list[MetricsReport] = Field(default_factory=list)
    diagnoses: list[Diagnosis] = Field(default_factory=list)
    oos_results: list[OOSResult] = Field(default_factory=list)

    survivors: list[str] = Field(default_factory=list)   # strategy names
    promoted: Optional[str] = None

    audit_log: list[dict] = Field(default_factory=list)  # {time, step, message}
    errors: list[str] = Field(default_factory=list)


class RunConfig(BaseModel):
    min_icir: float = 1.0
    min_half_life_days: int = 10
    n_variants: int = 4
    oos_split_pct: float = 0.20
    data_source: str = "yfinance"   # "yfinance" | "mock"
    api_key: Optional[str] = None   # ANTHROPIC_API_KEY
