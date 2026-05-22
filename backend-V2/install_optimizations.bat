@echo off
REM Chat Optimization - Installation & Testing Script for Windows
REM This script installs dependencies and verifies the implementation

setlocal enabledelayedexpansion

echo.
echo ==========================================
echo Neural Nexus Chat Optimization
echo Installation ^& Verification Script
echo ==========================================
echo.

REM Step 1: Check Python
echo ^[Step 1^] Checking Python...
python --version || (
    echo ERROR: Python not found. Please install Python 3.8+
    exit /b 1
)
echo.

REM Step 2: Navigate to backend
echo ^[Step 2^] Setting up backend environment...
cd backend || (
    echo ERROR: Failed to enter backend directory
    exit /b 1
)
echo   Current directory: %cd%
echo.

REM Step 3: Create virtual environment (if needed)
if not exist "venv\" (
    echo ^[Step 3^] Creating virtual environment...
    python -m venv venv
    echo   Virtual environment created
) else (
    echo ^[Step 3^] Virtual environment already exists
)
echo.

REM Step 4: Activate virtual environment
echo ^[Step 4^] Activating virtual environment...
call venv\Scripts\activate.bat
echo   Python path: %VIRTUAL_ENV%\Scripts\python.exe
echo.

REM Step 5: Install dependencies
echo ^[Step 5^] Installing required packages...
python -m pip install --upgrade pip
pip install -r requirements.txt
if !errorlevel! neq 0 (
    echo ERROR: Failed to install dependencies
    exit /b 1
)
echo   Dependencies installed successfully
echo.

REM Step 6: Verify key packages
echo ^[Step 6^] Verifying key packages...
python -c "import fastapi; print(f'  FastAPI: {fastapi.__version__}')" 2>nul || echo   [WARN] FastAPI not found
python -c "import sqlalchemy; print(f'  SQLAlchemy: {sqlalchemy.__version__}')" 2>nul || echo   [WARN] SQLAlchemy not found
python -c "import pydantic; print(f'  Pydantic: {pydantic.__version__}')" 2>nul || echo   [WARN] Pydantic not found
python -c "import fuzzywuzzy; print('  FuzzyWuzzy: OK')" 2>nul || echo   [WARN] FuzzyWuzzy not found
echo.

REM Step 7: Check new files
echo ^[Step 7^] Verifying new implementation files...
if exist "app\services\hybrid_rag_optimized.py" (
    echo   [OK] app\services\hybrid_rag_optimized.py exists
) else (
    echo   [ERROR] app\services\hybrid_rag_optimized.py MISSING
)
if exist "app\routes\chat_optimized.py" (
    echo   [OK] app\routes\chat_optimized.py exists
) else (
    echo   [ERROR] app\routes\chat_optimized.py MISSING
)
if exist "..\frontend-react-v2\src\pages\chat\OptimizedChatPage.jsx" (
    echo   [OK] OptimizedChatPage.jsx exists
) else (
    echo   [WARN] OptimizedChatPage.jsx not found (optional)
)
echo.

REM Step 8: Check main.py imports
echo ^[Step 8^] Checking main.py configuration...
findstr /m "chat_optimized" main.py >nul
if !errorlevel! equ 0 (
    echo   [OK] chat_optimized imported in main.py
) else (
    echo   [WARN] chat_optimized import may be missing
)
echo.

REM Step 9: Syntax check
echo ^[Step 9^] Checking Python syntax...
python -m py_compile app\services\hybrid_rag_optimized.py && (
    echo   [OK] hybrid_rag_optimized.py syntax OK
) || (
    echo   [ERROR] Syntax error in hybrid_rag_optimized.py
)
python -m py_compile app\routes\chat_optimized.py && (
    echo   [OK] chat_optimized.py syntax OK
) || (
    echo   [ERROR] Syntax error in chat_optimized.py
)
echo.

echo ==========================================
echo Installation Complete! [READY]
echo ==========================================
echo.
echo Next steps:
echo 1. Start backend: uvicorn main:app --reload
echo 2. Test health: curl http://localhost:8000/api/v1/chat-optimized/health
echo 3. Send query: curl -X POST http://localhost:8000/api/v1/chat-optimized/query ...
echo.
echo For details: QUICK_START_CHAT_OPTIMIZATION.md
echo.
pause
