#!/usr/bin/env bash
# CTFLand — production-style start: install deps (optional), build, run Next.js (web workspace).
# Works on: Linux, macOS, Git Bash / MSYS2 / WSL on Windows.
#
# Usage:
#   chmod +x start_application.bash   # once on Unix
#   ./start_application.bash
#
# Env (optional):
#   CTFLAND_SKIP_INSTALL=1   Skip `npm install` (use when node_modules already present)
#   CTFLAND_SKIP_ENV_BOOTSTRAP=1   Do not copy apps/web/.env.example → .env if missing

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$SCRIPT_DIR"
WEB_DIR="$REPO_ROOT/next-monorepo/apps/web"
MONO_ROOT="$REPO_ROOT/next-monorepo"

die() { echo "Error: $*" >&2; exit 1; }

command -v node >/dev/null 2>&1 || die "Node.js is required (>= 20). Install from https://nodejs.org/"
command -v npm >/dev/null 2>&1 || die "npm is required (bundled with Node.js)."

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)"
if [[ "${NODE_MAJOR:-0}" -lt 20 ]]; then
  die "Node.js 20+ is required (found: $(node -v 2>/dev/null || echo unknown))."
fi

[[ -d "$MONO_ROOT" ]] || die "Missing directory: $MONO_ROOT (run this script from the CTFLand repo root)."

if [[ "${CTFLAND_SKIP_ENV_BOOTSTRAP:-0}" != "1" ]] && [[ ! -f "$WEB_DIR/.env" ]] && [[ -f "$WEB_DIR/.env.example" ]]; then
  cp "$WEB_DIR/.env.example" "$WEB_DIR/.env"
  echo "Created $WEB_DIR/.env from .env.example — add RPC URL, WalletConnect ID, etc."
fi

if [[ "${CTFLAND_SKIP_INSTALL:-0}" != "1" ]]; then
  if [[ ! -d "$MONO_ROOT/node_modules" ]]; then
    echo "Installing npm dependencies (first run can take a few minutes)…"
    (cd "$MONO_ROOT" && npm install)
  fi
fi

echo "Building (turbo)…"
(cd "$MONO_ROOT" && npm run build)

echo "Starting production server (Next.js web)…"
echo "Default URL: http://localhost:3000 — stop with Ctrl+C"
(cd "$MONO_ROOT" && npm run start)
