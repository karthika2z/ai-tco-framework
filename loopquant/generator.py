"""
LLM-powered strategy variant generator using instructor + Claude.
"""

from __future__ import annotations

import logging

import instructor
from anthropic import Anthropic

from models import StrategyVariants, RunConfig

logger = logging.getLogger(__name__)


_SYSTEM = """You are an expert quantitative analyst. Your job is to convert a plain-English
trading idea into concrete, backtestable strategy variants. Each variant must differ
meaningfully from the others in its entry logic, parameters, or filtering approach.

Signal types available:
- SMA_CROSS: params {fast, slow} (fast/slow period in days)
- RSI_THRESHOLD: params {period, threshold} (RSI period + oversold level, e.g. 30)
- MACD_SIGNAL: params {fast, slow, signal}
- BB_MEAN_REV: params {period, std_dev} (Bollinger mean reversion)
- PRICE_BREAKOUT: params {lookback} (N-day high breakout)
- MEAN_REVERSION: params {period, std_dev} (z-score mean reversion)

Exit types available:
- TIME_BASED: params {days}
- STOP_LOSS: params {pct} (e.g. 0.07 = 7%)
- PROFIT_TARGET: params {pct}
- REVERSAL: params {} (exit when entry signal reverses)

Filters (optional): trend_filter, volatility_filter, volume_filter

All strategies are LONG-ONLY. Keep parameter values realistic."""


def _holding_days(holding_period: str) -> int:
    mapping = {
        "Short-term (1–2 days)": 2,
        "Swing (2–10 days)": 7,
        "Medium-term (2–8 weeks)": 20,
        "Long-term (months)": 60,
    }
    return mapping.get(holding_period, 7)


def generate_variants(idea: str, universe: str, holding_period: str, config: RunConfig) -> StrategyVariants:
    client = instructor.from_anthropic(Anthropic(api_key=config.api_key))
    days   = _holding_days(holding_period)

    prompt = f"""Convert this trading idea into exactly {config.n_variants} strategy variants.

IDEA: {idea}
UNIVERSE: {universe}
HOLDING PERIOD: {holding_period} (~{days} trading days)

Requirements:
1. Each variant should use a DIFFERENT entry signal type
2. Exit rules should match the intended holding period (~{days} days)
3. Add filters where they logically improve the strategy
4. Keep descriptions in plain English that a beginner can understand
5. Output exactly {config.n_variants} variants

Return the full StrategyVariants object."""

    try:
        result = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=4096,
            system=_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
            response_model=StrategyVariants,
        )
        logger.info("Generator produced %d variants", len(result.variants))
        return result
    except Exception as exc:
        logger.error("Generator failed: %s", exc)
        raise RuntimeError(f"Strategy generation failed: {exc}") from exc
