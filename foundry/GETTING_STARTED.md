# CTFLand Foundry — getting started

## 1. Install Foundry

See [Foundry book](https://book.getfoundry.sh/getting-started/installation).

## 2. Dependencies

```bash
cd foundry
forge build
```

## 3. Deployer wallet (recommended for hackathons)

Store the deployer key in Foundry’s keystore — **not** in `.env`:

```bash
cast wallet import deployer --interactive
```

You will be prompted for the private key and a password. The account is saved under the name **`deployer`** (use that exact name so scripts below match). To use a different label, set `DEPLOYER_ACCOUNT` in `.env` and pass `--account` accordingly.

To see the address:

```bash
cast wallet list
```

Fund that address on **Arbitrum Sepolia** and **Avalanche Fuji** from each network’s faucet.

## 4. RPC URLs

Copy `foundry/.env.example` to `foundry/.env` and set your RPC URLs (and optional fork URLs). **Do not** put private keys in `.env`.

```bash
cp .env.example .env
# edit .env — only non-secret config
```

## 5. Deploy core contracts to both testnets

With `.env` loaded and `deployer` funded:

```bash
source .env
export FOUNDRY_KEYSTORE_PASSWORD=your_keystore_password   # non-interactive; do not commit
./script/deploy/deploy_both_testnets.sh
```

Or use a raw key: `export DEPLOYER_PRIVATE_KEY=0x…` (also never commit).

The script writes **`contract_addresses.json`** at the repo root and syncs **`next-monorepo/apps/web/lib/contract-addresses.json`**. If Infura returns HTTP 429 on Fuji, retry or set `AVALANCHE_TESTNET_RPC_URL` to a public endpoint (e.g. `https://api.avax-test.network/ext/bc/C/rpc`).

**Note:** Foundry treats **`ETH_PASSWORD` as a path to a password file**, not the literal password — use **`FOUNDRY_KEYSTORE_PASSWORD`** for the string, or point **`ETH_PASSWORD`** at a file that contains the password.

## 6. Local fork (optional)

Start Anvil against a fork URL from `.env`, matching `AVALANCHE_FORK_CHAIN_ID` or `ARBITRUM_FORK_CHAIN_ID`, then:

```bash
forge script script/deploy/DeployCTFLandCoreAvalancheFork.s.sol:DeployCTFLandCoreAvalancheFork \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast \
  --account deployer
```

## 7. Protocol treasury (`Registry.protocolTreasury`)

`distributeRewards` requires a **non-zero** `protocolTreasury` (1% fee slice in Pitch paths). Deploy a minimal **`ProtocolTreasuryVault`** and point both Registries at it:

```bash
cd foundry
source .env
source ../.env   # CRE_ETH_PRIVATE_KEY or DEPLOYER_PRIVATE_KEY + RPC URLs
chmod +x script/deploy/configure_protocol_treasury.sh
./script/deploy/configure_protocol_treasury.sh
```

This broadcasts `ConfigureProtocolTreasury` on **Arbitrum Sepolia** and **Avalanche Fuji**, then runs `script/deploy/merge-protocol-treasury.mjs` to add `ProtocolTreasury` addresses to `next-monorepo/apps/web/lib/contract-addresses.json`. The deployer must own each `Registry` (same wallet that deployed core contracts).

## 8. Tests

```bash
forge test
forge test -vv
```

See `test/` for unit tests per contract and `test/Integration.t.sol` for end-to-end flows.
