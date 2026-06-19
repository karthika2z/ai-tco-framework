# 🔄 LoopQuant

> Turn any trading idea into a statistically validated strategy — in minutes.

LoopQuant runs a closed **generate → backtest → score → diagnose → OOS gate → promote** loop, built for trading beginners and quants alike.

---

## Quick Start

```bash
git clone https://github.com/karthika2z/loopquant
cd loopquant
bash setup.sh          # one-time setup (creates .venv, installs deps)
make run               # launches the app
```

Then open **http://localhost:8501** in your browser.

---

## How it works

The loop has 6 steps — all automatic:

| Step | What happens |
|------|-------------|
| 1 · Generate | AI creates 3–5 strategy variants from your plain-English idea |
| 2 · Backtest | Each variant is tested against historical market data |
| 3 · Score | Variants ranked by **ICIR**, **Half-life**, and **Sharpe Ratio** |
| 4 · Diagnose | AI explains in plain English why each variant worked or failed |
| 5 · OOS Gate | Top candidates re-tested on data they've *never* seen |
| 6 · Promote | Only strategies that pass all gates reach you |

---

## Key metrics

| Metric | What it means | Minimum |
|--------|--------------|---------|
| **ICIR** | How *consistently* the signal predicts returns (like a batting average for edge) | ≥ 1.0 |
| **Half-life** | How long the signal stays predictive before decaying | ≥ 10 days |
| **Sharpe** | Risk-adjusted return (return ÷ volatility) | ≥ 1.0 |
| **OOS ICIR** | ICIR on held-out data never seen during development | Must hold |

---

## Project phases

| Phase | Status | What's real |
|-------|--------|-------------|
| **Phase 0** (this) | ✅ Done | Full UI, all screens, mock data |
| **Phase 1** | 🔜 Next | Real LLM (Claude), real backtester, Alpaca data |
| **Phase 2** | 🔜 Later | Critic agent, OOS gate, cost modeling, persistence |

---

## Requirements

- Python 3.10+
- ~80 MB disk space (dependencies)
- No API keys needed for Phase 0 (all mock data)

---

## File structure

```
loopquant/
├── app.py            # Main Streamlit app — all 3 screens
├── mock_data.py      # Hardcoded results, chart data, audit log (Phase 0)
├── requirements.txt  # 4 Python dependencies
├── setup.sh          # One-command setup script
├── Makefile          # make setup / make run / make clean
└── README.md
```

---

*Disclaimer: Educational/research tool only. Trading involves risk of loss. Not financial advice.*
