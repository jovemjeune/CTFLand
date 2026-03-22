#!/usr/bin/env bash
# One-shot CCIP lane (CTFLand default): canonical = Avalanche Fuji (43113), mirror = Arbitrum Sepolia (421614).
# Prerequisites: funded deployer on BOTH chains; Foundry keystore `deployer` or DEPLOYER_PRIVATE_KEY.
#
# Routers: https://docs.chain.link/ccip/directory/testnet — verify before mainnet.
#
# Usage (from repo root):
#   cd foundry && chmod +x script/deploy/finalize_ccip_testnet.sh
#   export DEPLOYER_PRIVATE_KEY=0x...   # or keystore + DEPLOYER_PASSWORD
#   ./script/deploy/finalize_ccip_testnet.sh
#
# Keystore + password (literal — not a file path; Forge 1.x maps ETH_PASSWORD to a *file*):
#   DEPLOYER_PASSWORD=... ./script/deploy/finalize_ccip_testnet.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck source=/dev/null
  source .env
  set +a
fi

# --- Chainlink CCIP testnet directory (Mar 2026) — re-verify when upgrading ---
CCIP_ROUTER_ARBITRUM_SEPOLIA="${CCIP_ROUTER_ARBITRUM_SEPOLIA:-0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165}"
CCIP_ROUTER_AVALANCHE_FUJI="${CCIP_ROUTER_AVALANCHE_FUJI:-0xF694E193200268f9a4868e4Aa017A0118C9a8177}"

ARBITRUM_RPC="${ARBITRUM_TESTNET_RPC_URL:-https://sepolia-rollup.arbitrum.io/rpc}"
FUJI_RPC="${AVALANCHE_TESTNET_RPC_URL:-https://api.avax-test.network/ext/bc/C/rpc}"

MIRROR_CHAIN_ID=421614
CANONICAL_CHAIN_ID=43113
# Source = canonical (Fuji) when configuring receiver on Arbitrum
SOURCE_CHAIN_SELECTOR=14767482510784806043
# Destination from passport (Fuji) → Arbitrum Sepolia
DEST_CHAIN_SELECTOR=3478487238524512106

DEPLOYER_ACCOUNT="${DEPLOYER_ACCOUNT:-deployer}"

# Solidity scripts need `DEPLOYER` — `msg.sender` inside `Script.run()` is not the signing EOA.
if [[ -z "${DEPLOYER:-}" ]]; then
  if [[ -n "${DEPLOYER_PRIVATE_KEY:-}" ]]; then
    export DEPLOYER="$(cast wallet address "${DEPLOYER_PRIVATE_KEY}")"
  elif [[ -n "${DEPLOYER_PASSWORD:-}" ]]; then
    export DEPLOYER="$(cast wallet address --account "$DEPLOYER_ACCOUNT" --password "$DEPLOYER_PASSWORD")"
  else
    export DEPLOYER="$(cast wallet address --account "$DEPLOYER_ACCOUNT")"
  fi
fi

# forge: use `--password` for keystore passphrase; `ETH_PASSWORD` alone is treated as a password *file* path.
BROADCAST=(--broadcast)
if [[ -n "${DEPLOYER_PRIVATE_KEY:-}" ]]; then
  BROADCAST+=(--private-key "$DEPLOYER_PRIVATE_KEY")
elif [[ -n "${DEPLOYER_PASSWORD:-}" ]]; then
  BROADCAST+=(--account "$DEPLOYER_ACCOUNT" --password "$DEPLOYER_PASSWORD")
else
  BROADCAST+=(--account "$DEPLOYER_ACCOUNT")
fi

echo "Deployer (DEPLOYER): $DEPLOYER"
export DEPLOYER

echo "== 1/3 Deploy mirror stack on Arbitrum Sepolia (${MIRROR_CHAIN_ID}) =="
export MIRROR_CHAIN_ID
export CCIP_ROUTER="$CCIP_ROUTER_ARBITRUM_SEPOLIA"
forge script script/deploy/DeployCCIPMirrorStack.s.sol:DeployCCIPMirrorStack \
  --rpc-url "$ARBITRUM_RPC" "${BROADCAST[@]}"

MIRROR_JSON="$ROOT/broadcast/DeployCCIPMirrorStack.s.sol/${MIRROR_CHAIN_ID}/run-latest.json"
RECEIVER_ADDR="$(python3 -c '
import json, sys
path = sys.argv[1]
with open(path) as f:
    j = json.load(f)
for t in j.get("transactions", []):
    if t.get("transactionType") == "CREATE" and t.get("contractName") == "CCIPRegistryMirrorReceiver":
        print(t["contractAddress"])
        sys.exit(0)
sys.stderr.write("CCIPRegistryMirrorReceiver not in " + path + "\n")
sys.exit(1)
' "$MIRROR_JSON")"

MIRROR_ADDR="$(python3 -c '
import json, sys
path = sys.argv[1]
with open(path) as f:
    j = json.load(f)
for t in j.get("transactions", []):
    if t.get("transactionType") == "CREATE" and t.get("contractName") == "RegistryMirror":
        print(t["contractAddress"])
        sys.exit(0)
sys.stderr.write("RegistryMirror not in " + path + "\n")
sys.exit(1)
' "$MIRROR_JSON")"

echo "RegistryMirror (mirror): $MIRROR_ADDR"
echo "CCIPRegistryMirrorReceiver (mirror): $RECEIVER_ADDR"

echo "== 2/3 Deploy CCIPRegistryPassport on Fuji (${CANONICAL_CHAIN_ID}) + setDestination =="
export CANONICAL_CHAIN_ID
export CCIP_ROUTER="$CCIP_ROUTER_AVALANCHE_FUJI"
export CCIP_DEST_CHAIN_SELECTOR="$DEST_CHAIN_SELECTOR"
export CCIP_DEST_RECEIVER="$RECEIVER_ADDR"

forge script script/deploy/DeployCCIPCanonicalPassport.s.sol:DeployCCIPCanonicalPassport \
  --rpc-url "$FUJI_RPC" "${BROADCAST[@]}"

PASSPORT_JSON="$ROOT/broadcast/DeployCCIPCanonicalPassport.s.sol/${CANONICAL_CHAIN_ID}/run-latest.json"
PASSPORT_ADDR="$(python3 -c '
import json, sys
path = sys.argv[1]
with open(path) as f:
    j = json.load(f)
for t in j.get("transactions", []):
    if t.get("transactionType") == "CREATE" and t.get("contractName") == "CCIPRegistryPassport":
        print(t["contractAddress"])
        sys.exit(0)
sys.stderr.write("CCIPRegistryPassport not in " + path + "\n")
sys.exit(1)
' "$PASSPORT_JSON")"

echo "Passport (canonical): $PASSPORT_ADDR"

echo "== 3/3 Configure receiver.setPeer on Arbitrum Sepolia =="
export CCIP_REGISTRY_MIRROR_RECEIVER="$RECEIVER_ADDR"
export SOURCE_CHAIN_SELECTOR
export CCIP_REGISTRY_PASSPORT="$PASSPORT_ADDR"

forge script script/deploy/ConfigureCCIPMirrorReceiverPeer.s.sol:ConfigureCCIPMirrorReceiverPeer \
  --rpc-url "$ARBITRUM_RPC" "${BROADCAST[@]}"

echo ""
echo "=== Done. Merge into next-monorepo/apps/web/lib/contract-addresses.json ==="
echo "Chain ${CANONICAL_CHAIN_ID}: \"CCIPRegistryPassport\": \"${PASSPORT_ADDR}\""
echo "Chain ${MIRROR_CHAIN_ID}: \"RegistryMirror\": \"${MIRROR_ADDR}\""
echo "Chain ${MIRROR_CHAIN_ID}: \"CCIPRegistryMirrorReceiver\": \"${RECEIVER_ADDR}\""
echo ""
echo "Or run: node script/deploy/merge-ccip-addresses.mjs"
