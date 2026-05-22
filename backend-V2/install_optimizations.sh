#!/usr/bin/env bash
# Chat Optimization - Installation & Testing Script
# This script installs dependencies and verifies the implementation

set -e  # Exit on any error

echo "=========================================="
echo "Neural Nexus Chat Optimization"
echo "Installation & Verification Script"
echo "=========================================="
echo ""

# Step 1: Check Python
echo "✓ Step 1: Checking Python..."
python3 --version || python --version
echo ""

# Step 2: Navigate to backend
echo "✓ Step 2: Setting up backend environment..."
cd backend || exit 1
echo "  Current directory: $(pwd)"
echo ""

# Step 3: Create virtual environment (if needed)
if [ ! -d "venv" ]; then
    echo "✓ Step 3: Creating virtual environment..."
    python3 -m venv venv || python -m venv venv
    echo "  Virtual environment created"
else
    echo "✓ Step 3: Virtual environment already exists"
fi
echo ""

# Step 4: Activate virtual environment
echo "✓ Step 4: Activating virtual environment..."
source venv/bin/activate || . venv/Scripts/activate
echo "  Python path: $(which python)"
echo ""

# Step 5: Install dependencies
echo "✓ Step 5: Installing required packages..."
pip install --upgrade pip
pip install -r requirements.txt
echo "  Dependencies installed"
echo ""

# Step 6: Verify key packages
echo "✓ Step 6: Verifying key packages..."
python3 -c "import fastapi; print(f'  FastAPI: {fastapi.__version__}')" 2>/dev/null || echo "  ⚠️  FastAPI not found"
python3 -c "import sqlalchemy; print(f'  SQLAlchemy: {sqlalchemy.__version__}')" 2>/dev/null || echo "  ⚠️  SQLAlchemy not found"
python3 -c "import pydantic; print(f'  Pydantic: {pydantic.__version__}')" 2>/dev/null || echo "  ⚠️  Pydantic not found"
python3 -c "import fuzzywuzzy; print('  FuzzyWuzzy: ✓')" 2>/dev/null || echo "  ⚠️  FuzzyWuzzy not found"
echo ""

# Step 7: Check new files
echo "✓ Step 7: Verifying new implementation files..."
files=(
    "app/services/hybrid_rag_optimized.py"
    "app/routes/chat_optimized.py"
    "../frontend-react-v2/src/pages/chat/OptimizedChatPage.jsx"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file exists"
    else
        echo "  ❌ $file MISSING"
    fi
done
echo ""

# Step 8: Check main.py imports
echo "✓ Step 8: Checking main.py imports..."
if grep -q "chat_optimized" main.py; then
    echo "  ✅ chat_optimized imported in main.py"
else
    echo "  ⚠️  chat_optimized import missing in main.py"
fi
echo ""

# Step 9: Syntax check
echo "✓ Step 9: Checking Python syntax..."
python3 -m py_compile app/services/hybrid_rag_optimized.py && echo "  ✅ hybrid_rag_optimized.py syntax OK" || echo "  ❌ Syntax error in hybrid_rag_optimized.py"
python3 -m py_compile app/routes/chat_optimized.py && echo "  ✅ chat_optimized.py syntax OK" || echo "  ❌ Syntax error in chat_optimized.py"
echo ""

echo "=========================================="
echo "Installation Complete! ✅"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Start the backend: uvicorn main:app --reload"
echo "2. Test health check: curl http://localhost:8000/api/v1/chat-optimized/health"
echo "3. Run a query: curl -X POST http://localhost:8000/api/v1/chat-optimized/query ..."
echo ""
echo "For more details, see: QUICK_START_CHAT_OPTIMIZATION.md"
echo ""
