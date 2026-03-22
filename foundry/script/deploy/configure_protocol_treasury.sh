#!/usr/bin/env bash
set -euo pipefail

# Deploy ProtocolTreasuryVault and call Registry.setProtocolTreasury on Arbitrum Sepolia + Avalanche Fuji.
# Requires Registry addresses (defaults match next-monorepo contract-addresses.json).
#
#   cd foundry && source .env && source ../.env  # RPC + CRE_ETH_PRIVATE_KEY or DEPLOYER_PRIVATE_KEY
#   ./script/deploy/configure_protocol_treasury.sh
#
# After success, run:
#   node script/deploy/merge-protocol-treasury.mjs

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

if [[ -z "${DEPLOYER_PRIVATE_KEY:-}" && -n "${CRE_ETH_PRIVATE_KEY:-}" && "${CRE_ETH_PRIVATE_KEY:0:2}" == "0x" ]]; then
  DEPLOYER_PRIVATE_KEY="$CRE_ETH_PRIVATE_KEY"
fi
if [[ -z "${DEPLOYER_PRIVATE_KEY:-}" ]]; then
  echo "Set DEPLOYER_PRIVATE_KEY or CRE_ETH_PRIVATE_KEY (0x-prefixed)."
  exit 1
fi

REGISTRY_ARB="${REGISTRY_ADDRESS_ARBITRUM_SEPOLIA:-0xb009dbc9a1a174348b1a8c3af981b4d144a5c9bb}"
REGISTRY_FUJI="${REGISTRY_ADDRESS_FUJI:-0x9692dbefce17a1333be9f6f28ece2e2cdcb23f6a}"

if [[ -z "${ARBITRUM_TESTNET_RPC_URL:-}" || -z "${AVALANCHE_TESTNET_RPC_URL:-}" ]]; then
  echo "Missing ARBITRUM_TESTNET_RPC_URL or AVALANCHE_TESTNET_RPC_URL."
  exit 1
fi

cd "$FOUNDRY_ROOT"

run_cfg() {
  local rpc="$1"
  local reg="$2"
  echo "ConfigureProtocolTreasury on registry $reg ..."
  REGISTRY_ADDRESS="$reg" forge script script/deploy/ConfigureProtocolTreasury.s.sol:ConfigureProtocolTreasury \
    --rpc-url "$rpc" \
    --broadcast \
    --private-key "$DEPLOYER_PRIVATE_KEY"
}

run_cfg "$ARBITRUM_TESTNET_RPC_URL" "$REGISTRY_ARB"
run_cfg "$AVALANCHE_TESTNET_RPC_URL" "$REGISTRY_FUJI"

echo ""
echo "Merging vault addresses into contract-addresses.json ..."
node "$SCRIPT_DIR/merge-protocol-treasury.mjs"

echo "Done."
