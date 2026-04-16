@echo off
REM SkillSwap NLP Setup Script for Windows
REM Automates the setup of the semantic matching system

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════╗
echo ║   SkillSwap NLP System Setup                   ║
echo ║   Production-Grade Semantic Matching            ║
echo ║   Windows Edition                              ║
echo ╚════════════════════════════════════════════════╝
echo.

REM Check prerequisites
echo Checking prerequisites...
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌  Python is not installed. Please install Python 3.9+ first.
    pause
    exit /b 1
)
for /f "tokens=2" %%a in ('python --version 2^>^&1') do set PYTHON_VER=%%a
echo ✅  Python %PYTHON_VER% found
echo.

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌  Node.js is not installed. Please install Node.js 16+ first.
    pause
    exit /b 1
)
for /f "tokens=1" %%a in ('node --version') do set NODE_VER=%%a
echo ✅  Node.js %NODE_VER% found
echo.

echo ─────────────────────────────────────────────────
echo.

REM Setup NLP Service
echo Setting up NLP Microservice...
echo.

if not exist "nlp-service\venv" (
    echo ℹ️   Creating Python virtual environment...
    cd nlp-service
    python -m venv venv
    call venv\Scripts\activate.bat
    echo ✅  Virtual environment created
    echo.
    
    echo ℹ️   Installing Python dependencies...
    pip install --upgrade pip >nul 2>&1
    pip install -r requirements.txt >nul 2>&1
    echo ✅  Dependencies installed
    echo.
    
    cd ..
) else (
    echo ✅  Virtual environment already exists
    call nlp-service\venv\Scripts\activate.bat
)

echo.
echo ─────────────────────────────────────────────────
echo.

REM Setup Backend
echo Setting up Node.js Backend...
echo.

cd server

if not exist "node_modules" (
    echo ℹ️   Installing Node.js dependencies...
    call npm install >nul 2>&1
    echo ✅  Dependencies installed
) else (
    echo ✅  Node.js dependencies already installed
)

if not exist ".env" (
    echo ℹ️   Creating .env file...
    (
        echo PORT=5050
        echo NODE_ENV=development
        echo MONGODB_URI=mongodb://localhost:27017/skillswap
        echo JWT_SECRET=dev_secret_change_in_production
        echo CLIENT_URL=http://localhost:5173
        echo NLP_SERVICE_URL=http://localhost:8000
    ) > .env
    echo ✅  .env created
) else (
    echo ✅  .env already exists
)

cd ..

echo.
echo ─────────────────────────────────────────────────
echo.

REM Setup Frontend
echo Setting up Frontend...
echo.

cd client

if not exist "node_modules" (
    echo ℹ️   Installing frontend dependencies...
    call npm install >nul 2>&1
    echo ✅  Dependencies installed
) else (
    echo ✅  Frontend dependencies already installed
)

cd ..

echo.
echo ─────────────────────────────────────────────────
echo.

echo.
echo ╔════════════════════════════════════════════════╗
echo ║   Setup Complete! 🎉                           ║
echo ╚════════════════════════════════════════════════╝
echo.

echo Next steps to start the system:
echo.
echo Command Prompt 1 - Start NLP Service:
echo   cd nlp-service
echo   venv\Scripts\activate.bat
echo   python main.py
echo.

echo Command Prompt 2 - Start Backend:
echo   cd server
echo   npm run dev
echo.

echo Command Prompt 3 - Start Frontend (optional):
echo   cd client
echo   npm run dev
echo.

echo ─────────────────────────────────────────────────
echo.

echo Verify services are running:
echo   http://localhost:8000/health    (NLP Service)
echo   http://localhost:5050            (Backend)
echo   http://localhost:5173            (Frontend)
echo.

echo ─────────────────────────────────────────────────
echo.

echo After services are running, populate embeddings:
echo   cd server
echo   node scripts/migrate-add-embeddings.js
echo.

echo For detailed documentation, see:
echo   - NLP_INTEGRATION_GUIDE.md
echo   - IMPLEMENTATION_SUMMARY.md
echo   - nlp-service\README.md
echo.

pause
