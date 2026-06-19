"""
LLM critic: diagnoses why strategies worked or failed.
"""

from __future__ import annotations

import logging

import instructor
from anthropic import Anthropic

from models import DiagnosisBatch, MetricsReport, RunConfig, StrategySpec

logger = logging.getLogger(__name__)


_SYSTEM = """You are a quant research critic. Given backtest and metrics results,
explain in plain English why each strategy worked or failed. Be specific, honest,
and educational. Avoid jargon. A trading beginner should understand your diagnosis."""


def diagnose(
    specs: list[StrategySpec],
    metrics: list[MetricsReport],
    config: RunConfig,
) -> DiagnosisBatch:
    client = instructor.from_anthropic(Anthropic(api_key=config.api_key))

    metric_lines = []
    for m in metrics:
        spec = next((s for s in specs if s.name == m.strategy_name), None)
        desc = spec.description if spec else ""
        passed = m.passed_icir_gate and m.passed_halflife_gate
        status = "PASSED gates" if passed else "REJECTED"
        metric_lines.append(
            f"- {m.strategy_name} [{status}]: "
            f"ICIR={m.icir:.2f} (min {config.min_icir}), "
            f"Half-life={m.half_life_days:.0f}d (min {config.min_half_life_days}d), "
            f"Sharpe={m.sharpe:.2f}, "
            f"Return={m.total_return_pct:.1f}%, "
            f"MaxDD={m.max_drawdown_pct:.1f}%\n  Description: {desc}"
        )

    prompt = f"""Here are the results for all strategy variants:

{chr(10).join(metric_lines)}

For each strategy, provide:
1. verdict: "promising" if it passed both gates, else "rejected"
2. summary: 2–3 sentences explaining the verdict in plain English
3. strengths: 2–4 bullet points (what worked)
4. weaknesses: 2–4 bullet points (what failed or what risks remain)
5. suggestions: 1–2 actionable ideas to improve it

Be specific about the metrics — mention the actual ICIR/half-life numbers."""

    try:
        result = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=4096,
            system=_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
            response_model=DiagnosisBatch,
        )
        logger.info("Critic produced %d diagnoses", len(result.diagnoses))
        return result
    except Exception as exc:
        logger.error("Critic failed: %s", exc)
        # Return empty diagnoses rather than crashing the loop
        return DiagnosisBatch(diagnoses=[])
