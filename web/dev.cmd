@echo off
REM Launches the product from the repository root (canonical: pnpm dev).
cd /d "%~dp0.."
pnpm.cmd dev
if errorlevel 1 (
  echo.
  echo Run from repo root: pnpm install ^&^& pnpm dev
  pause
  exit /b 1
)
