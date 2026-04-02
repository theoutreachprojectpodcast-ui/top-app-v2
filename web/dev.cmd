@echo off
REM Double-click or run from Command Prompt: syncs assets then starts Next.js.
cd /d "%~dp0"
pnpm.cmd run dev
if errorlevel 1 (
  echo.
  echo pnpm failed. Try: npm run dev
  echo Or install deps: pnpm.cmd install
  pause
  exit /b 1
)
