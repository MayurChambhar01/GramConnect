@echo off
title GramSeva AI Service - Port 6000
color 0A
cls

echo.
echo  ============================================
echo    GramSeva AI Service  ^|  Starting...
echo  ============================================
echo.

:: ── Check Python ──
python --version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo  [ERROR] Python not found!
    echo.
    echo  Please install Python from: https://python.org/downloads
    echo  IMPORTANT: Check "Add Python to PATH" during install!
    echo.
    pause
    exit /b 1
)

echo  Python found:
python --version
echo.

:: ── Go to ai-service folder ──
cd /d "%~dp0ai-service"
if not exist app.py (
    color 0C
    echo  [ERROR] app.py not found in ai-service folder!
    echo  Make sure you are running from the gramseva root folder.
    pause
    exit /b 1
)

:: ── Install packages ──
echo  Installing required packages...
echo  (This takes 1-2 minutes on first run)
echo.
pip install flask opencv-python numpy Pillow scikit-image scipy --quiet
if errorlevel 1 (
    echo.
    echo  Retrying package install...
    pip install flask opencv-python numpy Pillow scikit-image scipy
)

echo.
echo  ============================================
echo    Starting AI Service on port 6000...
echo  ============================================
echo.
echo   Visit to test: http://localhost:6000/health
echo.
echo   Keep this window OPEN while using GramSeva
echo   Press Ctrl+C to stop the AI service
echo  ============================================
echo.

python app.py

echo.
echo  [AI Service Stopped]
pause
