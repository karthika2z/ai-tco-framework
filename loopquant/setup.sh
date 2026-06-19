#!/usr/bin/env bash
# One-command setup for LoopQuant
set -e

echo "🔄 Setting up LoopQuant..."

# Require Python 3.10+
python_version=$(python3 -c "import sys; print(sys.version_info[:2] >= (3,10))" 2>/dev/null || echo "False")
if [ "$python_version" != "True" ]; then
    echo "❌ Python 3.10+ required. Current: $(python3 --version 2>&1)"
    exit 1
fi

# Create venv if it doesn't exist
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    echo "✓ Virtual environment created"
fi

# Install dependencies
source .venv/bin/activate
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt
echo "✓ Dependencies installed"

echo ""
echo "✅ Setup complete!"
echo ""
echo "To run LoopQuant:"
echo "  source .venv/bin/activate"
echo "  streamlit run app.py"
echo ""
echo "Or just:  make run"
