# CTFLand — production start (PowerShell). Requires Node.js 20+ on PATH.
# Run:  powershell -ExecutionPolicy Bypass -File .\start_application.ps1
#   or: right-click → Run with PowerShell (may need execution policy)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

if (-not (Test-Path "next-monorepo/package.json")) {
  Write-Error "Run this script from the CTFLand repo root (next-monorepo missing)."
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "Install Node.js 20+ from https://nodejs.org/"
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Error "npm not found."
}

$webEnv = "next-monorepo/apps/web/.env"
$webEx = "next-monorepo/apps/web/.env.example"
if (-not (Test-Path $webEnv) -and (Test-Path $webEx)) {
  Copy-Item $webEx $webEnv
  Write-Host "Created $webEnv from .env.example"
}

if (-not (Test-Path "next-monorepo/node_modules")) {
  Write-Host "Installing npm dependencies..."
  Set-Location next-monorepo
  npm install
  Set-Location $Root
}

Write-Host "Building..."
Set-Location next-monorepo
npm run build
Write-Host "Starting production server — http://localhost:3000"
npm run start
