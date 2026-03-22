# CCIP mirror stack — deployment runbook

This document turns the checklist in [`CROSS_CHAIN.md`](CROSS_CHAIN.md) into concrete **env vars**, **script order**, and **operations** notes.

## Canonical vs mirror (CTFLand default)

| Role | Default in app | Chain ID | Notes |
|------|----------------|----------|--------|
| **Canonical** | `NEXT_PUBLIC_CHAIN_ID` primary | **43113** Avalanche Fuji (default in `next-monorepo/apps/web`) | Authoritative `Registry` writes; deploy **`CCIPRegistryPassport`** here. |
| **Mirror** | Peer protocol chain | **421614** Arbitrum Sepolia | `RegistryMirror` + **`CCIPRegistryMirrorReceiver`**; receives CCIP. |

You may flip roles (Arbitrum canonical, Fuji mirror) by setting `NEXT_PUBLIC_CHAIN_ID=421614` and redeploying / re-pointing addresses — **keep one writer per product** and document which chain is canonical.

## CCIP constants (verify in [CCIP directory](https://docs.chain.link/ccip/directory/testnet))

| Network | Chain ID | CCIP chain selector (uint64) |
|---------|----------|-------------------------------|
| Avalanche Fuji | 43113 | `14767482510784806043` |
| Arbitrum Sepolia | 421614 | `3478487238524512106` |

Each network has its own **CCIP router** address — copy from Chainlink docs for the network you deploy on.

## Deploy order

1. **Mirror chain** — `DeployCCIPMirrorStack.s.sol`  
   - Deploys `RegistryMirror` → `CCIPRegistryMirrorReceiver(router, mirror, owner)` → `mirror.setTrustedRemoteExecutor(receiver)`.

2. **Canonical chain** — `DeployCCIPCanonicalPassport.s.sol`  
   - Deploys `CCIPRegistryPassport(router, owner)`.  
   - Optionally sets `setDestination` if `CCIP_DEST_CHAIN_SELECTOR` and `CCIP_DEST_RECEIVER` are set (receiver address from step 1).

3. **Mirror chain** — `ConfigureCCIPMirrorReceiverPeer.s.sol`  
   - Calls `receiver.setPeer(SOURCE_CHAIN_SELECTOR, true, CCIP_REGISTRY_PASSPORT)` where `SOURCE_CHAIN_SELECTOR` is the **canonical** chain’s CCIP selector and `CCIP_REGISTRY_PASSPORT` is the contract from step 2.

## One-shot testnet (Fuji canonical → Arbitrum mirror)

From `foundry/` (requires **native testnet gas on both chains** for the same deployer):

```bash
# Keystore: use literal passphrase via DEPLOYER_PASSWORD (Forge’s ETH_PASSWORD is a *file path*, not the password).
export DEPLOYER_PASSWORD=...   # or: export DEPLOYER_PRIVATE_KEY=0x...
./script/deploy/finalize_ccip_testnet.sh
node script/deploy/merge-ccip-addresses.mjs   # writes ../next-monorepo/apps/web/lib/contract-addresses.json
```

Scripts require **`DEPLOYER`** (the signing EOA). The shell derives it with `cast wallet address` unless you set `DEPLOYER=0x...` yourself.

Routers default to the [CCIP directory](https://docs.chain.link/ccip/directory/testnet) Arbitrum Sepolia / Avalanche Fuji entries; override with `CCIP_ROUTER_ARBITRUM_SEPOLIA` / `CCIP_ROUTER_AVALANCHE_FUJI` if Chainlink updates them.

## Forge examples (manual steps)

**Mirror stack** (RPC must be on mirror chain, e.g. Arbitrum Sepolia):

```bash
export MIRROR_CHAIN_ID=421614
export CCIP_ROUTER=0x...   # from CCIP docs for Arbitrum Sepolia
export DEPLOYER=0x...      # same EOA as `--private-key` / `--account` (see finalize_ccip_testnet.sh)
forge script script/deploy/DeployCCIPMirrorStack.s.sol:DeployCCIPMirrorStack \
  --rpc-url "$ARBITRUM_SEPOLIA_RPC" --broadcast ...
```

**Canonical passport** (e.g. Fuji):

```bash
export CANONICAL_CHAIN_ID=43113
export CCIP_ROUTER=0x...   # Fuji router from CCIP docs
# Optional immediate destination wiring:
export CCIP_DEST_CHAIN_SELECTOR=3478487238524512106
export CCIP_DEST_RECEIVER=0x...   # CCIPRegistryMirrorReceiver from mirror deploy
forge script script/deploy/DeployCCIPCanonicalPassport.s.sol:DeployCCIPCanonicalPassport \
  --rpc-url "$FUJI_RPC" --broadcast
```

**Receiver peer** (mirror chain again):

```bash
export MIRROR_CHAIN_ID=421614
export CCIP_REGISTRY_MIRROR_RECEIVER=0x...
export SOURCE_CHAIN_SELECTOR=14767482510784806043   # canonical Fuji selector
export CCIP_REGISTRY_PASSPORT=0x...                 # from canonical deploy
forge script script/deploy/ConfigureCCIPMirrorReceiverPeer.s.sol:ConfigureCCIPMirrorReceiverPeer \
  --rpc-url "$ARBITRUM_SEPOLIA_RPC" --broadcast
```

## `ccipSend` after Registry events

On-chain `Registry` does not automatically call the passport. Production options:

- **Ops / owner**: use [`/mirror`](../../next-monorepo/apps/web/app/mirror/page.tsx) (`sendCtfCreated` / `sendMarkFinished` / `sendResolved`) with `msg.value` ≥ `quoteSendFee` (native fee in `CCIPRegistryPassport`).
- **Automation**: index `Registry` events → relayer or [Chainlink Automation](https://docs.chain.link/chainlink-automation) → `CCIPRegistryPassport.send*` with `MirrorPayloadCodec`-compatible payloads (already encoded inside the contract).

Payload layout is **`MirrorPayloadCodec`** (`encodeCtfCreated` / `encodeMarkFinished` / `encodeResolved`).

## Monitoring

- **Failed executions**: [CCIP transaction explorer](https://ccip.chain.link/) and your lane’s **failed execution** / manual execution flow in Chainlink docs.
- **Fees / funding**: underfunded `ccipSend` reverts; watch native balance on the **owner** account used for sends (or LINK if you switch fee token — this repo uses **native** fee token in `CCIPRegistryPassport`).
- **Ordering**: `CCIPRegistryPassport` uses `allowOutOfOrderExecution: true` in extra args. If you change that to `false` in a fork, enforce **sequence** at the app or relayer layer (see [`CROSS_CHAIN.md`](CROSS_CHAIN.md) “Ordering and failures”).

## Frontend addresses

After deploy, add to `next-monorepo/apps/web/lib/contract-addresses.json`:

- `CCIPRegistryPassport` on the **canonical** chain row.
- `CCIPRegistryMirrorReceiver` on the **peer** chain row.

Or set `NEXT_PUBLIC_CCIP_REGISTRY_PASSPORT_ADDRESS` and `NEXT_PUBLIC_CCIP_REGISTRY_MIRROR_RECEIVER_ADDRESS` in `.env`. The `/mirror` page includes an **engineering checklist** that validates wiring when RPCs and addresses are available.
