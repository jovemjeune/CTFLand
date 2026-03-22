#!/usr/bin/env bash
set -euo pipefail

# Deploy CTFLand core contracts to:
# 1) Arbitrum Sepolia
# 2) Avalanche Fuji
#
# Auth (pick one):
#   - Keystore: `cast wallet import deployer --interactive` then use default DEPLOYER_ACCOUNT=deployer
#     Non-interactive password: export ETH_PASSWORD=... (or use --password-file)
#   - Raw key: export DEPLOYER_PRIVATE_KEY=0x...
#
# Optional World ID (CompetitorNFT):
#   WORLD_ID_MODE=mock          — deploy MockWorldID (default; proofs always pass on-chain)
#   WORLD_ID_MODE=router        — set WORLD_ID_ROUTER to the chain’s WorldIDRouter
#   WORLD_EXTERNAL_NULLIFIER_HASH — must match Developer Portal / IDKit for your app (default 1)
#
# Usage:
#   cd foundry
#   source .env
#   ./script/deploy/deploy_both_testnets.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FOUNDRY_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
REPO_ROOT="$(cd "$FOUNDRY_ROOT/.." && pwd)"

if [[ -f "$FOUNDRY_ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$FOUNDRY_ROOT/.env"
  set +a
fi
if [[ -f "$REPO_ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$REPO_ROOT/.env"
  set +a
fi

DEPLOYER_ACCOUNT="${DEPLOYER_ACCOUNT:-deployer}"

# Raw key: prefer explicit DEPLOYER_PRIVATE_KEY, else DEPLOYER / CRE_ETH_PRIVATE_KEY (only if hex key).
if [[ -z "${DEPLOYER_PRIVATE_KEY:-}" && -n "${DEPLOYER:-}" && "${DEPLOYER:0:2}" == "0x" && ${#DEPLOYER} -ge 64 ]]
then
  DEPLOYER_PRIVATE_KEY="$DEPLOYER"
fi
if [[ -z "${DEPLOYER_PRIVATE_KEY:-}" && -n "${CRE_ETH_PRIVATE_KEY:-}" && "${CRE_ETH_PRIVATE_KEY:0:2}" == "0x" && ${#CRE_ETH_PRIVATE_KEY} -ge 64 ]]
then
  DEPLOYER_PRIVATE_KEY="$CRE_ETH_PRIVATE_KEY"
fi
if [[ -n "${DEPLOYER_PRIVATE_KEY:-}" ]]; then
  export DEPLOYER_PRIVATE_KEY
fi

if [[ -z "${ARBITRUM_TESTNET_RPC_URL:-}" || -z "${AVALANCHE_TESTNET_RPC_URL:-}" ]]; then
  echo "Missing ARBITRUM_TESTNET_RPC_URL or AVALANCHE_TESTNET_RPC_URL in environment."
  echo "Run: source .env"
  exit 1
fi

# Keystore unlock: Foundry treats ETH_PASSWORD as a *file path*, not the literal password.
# Use FOUNDRY_KEYSTORE_PASSWORD for the password string, or ETH_PASSWORD if it points to an existing file.
if [[ -n "${DEPLOYER_PRIVATE_KEY:-}" ]]; then
  BROADCAST_AUTH=(--private-key "$DEPLOYER_PRIVATE_KEY")
else
  _pwfile="$(mktemp)"
  chmod 600 "$_pwfile"
  if [[ -n "${FOUNDRY_KEYSTORE_PASSWORD:-}" ]]; then
    printf '%s' "$FOUNDRY_KEYSTORE_PASSWORD" > "$_pwfile"
  elif [[ -n "${ETH_PASSWORD:-}" && -f "$ETH_PASSWORD" ]]; then
    cat "$ETH_PASSWORD" > "$_pwfile"
  else
    rm -f "$_pwfile"
    echo "For keystore deploy: set FOUNDRY_KEYSTORE_PASSWORD, or DEPLOYER_PRIVATE_KEY, or ETH_PASSWORD to a password file path."
    exit 1
  fi
  trap 'rm -f "$_pwfile"' EXIT
  BROADCAST_AUTH=(--account "$DEPLOYER_ACCOUNT" --password-file "$_pwfile")
fi

run_deploy() {
  local target="$1"
  local rpc="$2"
  echo "Deploying to ${target} (${DEPLOYER_PRIVATE_KEY:+private key from env}${DEPLOYER_PRIVATE_KEY:-keystore $DEPLOYER_ACCOUNT})..."
  TARGET_TESTNET="$target" forge script script/deploy/DeployCTFLandCoreTestnet.s.sol:DeployCTFLandCoreTestnet \
    --rpc-url "$rpc" \
    --broadcast \
    --slow \
    "${BROADCAST_AUTH[@]}"
}

cd "$FOUNDRY_ROOT"

run_deploy arbitrum_sepolia "$ARBITRUM_TESTNET_RPC_URL"
run_deploy avalanche_fuji "$AVALANCHE_TESTNET_RPC_URL"

echo "Merging addresses into contract_addresses.json ..."
node "$SCRIPT_DIR/merge-contract-addresses.mjs"

echo "Done. Broadcast logs: $FOUNDRY_ROOT/broadcast/"
echo "Addresses: $REPO_ROOT/contract_addresses.json and $REPO_ROOT/next-monorepo/apps/web/lib/contract-addresses.json"
