# Testnets, mainnets, and forked chains

## Do I need “mainnet Ethereum” or a minimum pre-asset?

- **No** — CTFLand can live only on **Arbitrum** and/or **Avalanche**. You do not need an Ethereum L1 mainnet deployment unless your product explicitly requires it (e.g. bridge source of truth on L1).
- **Per chain**, you only need that chain’s **native gas token** for real deployments (ETH on Arbitrum, AVAX on Avalanche). Rules are per-network, not “Ethereum mainnet minimum” for those rollups.
- **Relaxed path:** build and test on **Sepolia**, **Arbitrum Sepolia**, **Avalanche Fuji** — faucets, low stakes, good for iteration.
- **Production path:** same code, different RPC + addresses + audits + ops — still Arbitrum/Avalanche only if that’s your scope.

## Can I simulate everything on a fork?

**Backend / contracts — yes.**

- **Forge tests:** use a fork URL (`vm.createFork` / `[fork]` in tests) so state matches a real network at a block.
- **Local node:** run Anvil against a remote archive RPC:

```bash
anvil --fork-url "$FORK_URL" --chain-id 42161
```

Then deploy your contracts; they exist **only on your local fork**, on top of cloned chain state.

**Frontend — yes for development, with one caveat.**

- The UI only needs **chain ID**, **RPC URL**, and **contract addresses** + **ABIs**. Forks don’t change the ABI.
- Point the wallet (e.g. MetaMask) at **localhost** while Anvil runs, or use a **hosted fork URL** your team trusts.
- **Caveat:** end users in production use real networks; a fork is for **you**, not a substitute for testnet/mainnet QA unless you run a dedicated staging fork product (some teams do).

## Quick mental model

| Environment | Role |
|-------------|------|
| **Anvil + fork** | Fast iteration, impersonate whales, test against real DeFi layout |
| **Public testnets** | Shared staging, closer to real network behavior, faucets |
| **Mainnets** | Real users, real money, real security expectations |

You can be **relaxed on testnets** for both Arbitrum and Avalanche; tighten discipline as you approach mainnet.
