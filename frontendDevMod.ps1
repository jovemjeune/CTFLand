# CTFLand — development mode (PowerShell). Next.js dev with hot reload.

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

if (-not (Test-Path "next-monorepo/package.json")) {
  Write-Error "Run this script from the CTFLand repo root."
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Error "Install Node.js 20+ from https://nodejs.org/" }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { Write-Error "npm not found." }

$webEnv = "next-monorepo/apps/web/.env"
$webEx = "next-monorepo/apps/web/.env.example"
if (-not (Test-Path $webEnv) -and (Test-Path $webEx)) {
  Copy-Item $webEx $webEnv
  Write-Host "Created $webEnv from .env.example"
}

if (-not (Test-Path "next-monorepo/node_modules")) {
  Set-Location next-monorepo
  npm install
  Set-Location $Root
}

Write-Host "Dev server — http://localhost:3000 — Ctrl+C to stop"
Set-Location next-monorepo
npm run dev --workspace=web
