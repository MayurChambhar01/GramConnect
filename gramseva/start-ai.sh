#!/bin/bash
# ─────────────────────────────────────────────
# GramSeva AI Service Startup Script
# ─────────────────────────────────────────────
echo "🤖 Starting GramSeva AI Service..."

cd "$(dirname "$0")/ai-service"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Install it first."
    exit 1
fi

# Install dependencies if needed
echo "📦 Checking dependencies..."
pip install -r requirements.txt -q --break-system-packages 2>/dev/null || \
pip install -r requirements.txt -q

# Start service
export AI_PORT=${AI_PORT:-6000}
echo "✅ AI Service starting on http://localhost:$AI_PORT"
echo "   Endpoints:"
echo "   POST /face/register   — Register villager face"
echo "   POST /face/verify     — Verify face for attendance"
echo "   POST /complaint/check — Detect fake complaint photos"
echo "   GET  /health          — Health check"
echo ""
python3 app.py
