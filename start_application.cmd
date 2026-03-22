@echo off
setlocal EnableExtensions
REM CTFLand — production start (Windows cmd). Requires Node.js 20+ and npm on PATH.
REM Double-click or: start_application.cmd

cd /d "%~dp0"
if not exist "next-monorepo\package.json" (
  echo Error: next-monorepo not found. Run this from the CTFLand repo root.
  exit /b 1
)

where node >nul 2>&1 || (
  echo Install Node.js 20+ from https://nodejs.org/ and re-open this window.
  exit /b 1
)
where npm >nul 2>&1 || (
  echo npm not found. Reinstall Node.js LTS.
  exit /b 1
)

if not exist "next-monorepo\node_modules" (
  echo Installing npm dependencies ^(first run may take several minutes^)...
  pushd next-monorepo
  call npm install
  if errorlevel 1 exit /b 1
  popd
)

if not exist "next-monorepo\apps\web\.env" if exist "next-monorepo\apps\web\.env.example" (
  copy /Y "next-monorepo\apps\web\.env.example" "next-monorepo\apps\web\.env" >nul
  echo Created apps\web\.env from .env.example — edit RPC, WalletConnect, etc.
)

echo Building...
pushd next-monorepo
call npm run build
if errorlevel 1 exit /b 1

echo Starting production server — http://localhost:3000 — Ctrl+C to stop
call npm run start
popd
