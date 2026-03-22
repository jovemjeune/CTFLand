@echo off
setlocal EnableExtensions
REM CTFLand — development mode (Windows cmd). Hot reload Next.js web app.

cd /d "%~dp0"
if not exist "next-monorepo\package.json" (
  echo Error: next-monorepo not found. Run this from the CTFLand repo root.
  exit /b 1
)

where node >nul 2>&1 || (
  echo Install Node.js 20+ from https://nodejs.org/
  exit /b 1
)
where npm >nul 2>&1 || (
  echo npm not found.
  exit /b 1
)

if not exist "next-monorepo\node_modules" (
  echo Installing npm dependencies...
  pushd next-monorepo
  call npm install
  if errorlevel 1 exit /b 1
  popd
)

if not exist "next-monorepo\apps\web\.env" if exist "next-monorepo\apps\web\.env.example" (
  copy /Y "next-monorepo\apps\web\.env.example" "next-monorepo\apps\web\.env" >nul
  echo Created apps\web\.env from .env.example
)

echo Starting dev server — http://localhost:3000 — Ctrl+C to stop
pushd next-monorepo
call npm run dev --workspace=web
popd
