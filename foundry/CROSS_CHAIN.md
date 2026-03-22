# Cross-chain: Avalanche & Arbitrum

For **testnets vs mainnet vs local forks** (and whether you need Ethereum mainnet at all), see [`FORK_AND_TESTNET.md`](FORK_AND_TESTNET.md).

Nothing you asked for is “impossible.” **Cross-chain messaging** between **Avalanche C-Chain** and **Arbitrum** is a normal production pattern. What *is* important to internalize is that it is **not** one global synchronous database: messages are **asynchronous**, cost **fees**, and **finality** differs per chain.

## What we’re aiming for

- **Two deployments** (e.g. full stack on Arbitrum *and* Avalanche) so users can interact where liquidity and UX fit best.
- **Logical state** (CTF created, finished, resolved outcomes) **mirrored** on the other chain via a **bridge** so apps and explorers stay aligned.
- **Native collateral** (ETH on Arbitrum, AVAX on Avalanche) stays **per chain** unless you add an **asset bridge** (wrapped assets, CCIP token pools, etc.) — that is a separate, explicit product decision.

## Recommended mental model

| Piece | Role |
|--------|------|
| **Canonical Registry** | One chain is the **source of truth** for protocol rules you care to enforce on-chain first (pick per product). |
| **`RegistryMirror`** | Secondary chain holds a **read-oriented mirror** (`src/crosschain/RegistryMirror.sol`) updated only by a **trusted bridge executor**. |
| **Bridge** | Validates messages from the remote chain and calls `applyCtfCreated` / `applyMarkCtfFinished` / `applyResolved` with a **unique `messageId`** per delivery. |

`CrossChainMessenger` (`src/crosschain/CrossChainMessenger.sol`) gives **replay protection** (`messageId` consumed once) and a single **trusted executor** (your receiver contract, not an EOA).

## Chainlink CCIP (implemented here)

Dependency: **`lib/chainlink-ccip`** ([`smartcontractkit/chainlink-ccip`](https://github.com/smartcontractkit/chainlink-ccip)), remapped as `@chainlink/ccip/` in `foundry.toml`.

| Contract | Purpose |
|----------|---------|
| **`MirrorPayloadCodec`** (`src/crosschain/MirrorPayloadCodec.sol`) | `encodeCtfCreated` / `encodeMarkFinished` / `encodeResolved` — build the `data` field for `ccipSend` on the **canonical** chain. |
| **`CCIPRegistryPassport`** (`src/crosschain/CCIPRegistryPassport.sol`) | **CCRP** — **C**ross-**C**hain **R**egistry **P**assport: canonical-side **`ccipSend`** helper. Owner calls `sendCtfCreated` / `sendMarkFinished` / `sendResolved` with native fee (`msg.value` ≥ `quoteSendFee`). Deploy beside your canonical `Registry`; does **not** replace it. |
| **`CCIPRegistryMirrorReceiver`** (`src/crosschain/CCIPRegistryMirrorReceiver.sol`) | Extends Chainlink **`CCIPReceiver`**; router calls `ccipReceive`, which forwards to `RegistryMirror` using **`message.messageId`** as the replay key. |
| **`RegistryMirror`** | Must set **`setTrustedRemoteExecutor(address(receiver))`** to the receiver address after deploy. |

**Receiver setup:** call `setPeer(sourceChainSelector, true, peerSender)` with CCIP’s **chain selector** for the source network and the **address of your canonical sender contract** (`CCIPRegistryPassport`, decoded from `message.sender`). Use `address(0)` for `peerSender` only if you accept any sender (not recommended).

**Sender setup:** deploy **`CCIPRegistryPassport(ccipRouter, owner)`** on the canonical chain, then `setDestination(destChainSelector, ccipReceiverAddressOnDest)` where `ccipReceiverAddressOnDest` is your deployed **`CCIPRegistryMirrorReceiver`**. Fund each `send*` with enough native token for CCIP fees (see `quoteSendFee`).

**Resolved outcomes:** `encodeResolved` takes `outcomeInnerPayload` = `abi.encode(bytes32[] hackers, address[] judges, address jobWinner, address jobJudge)` — the same tuple `RegistryMirror.applyResolved` decodes.

See [CCIP docs](https://docs.chain.link/ccip) for **router addresses**, **fee tokens**, and **chain selectors** (they differ from numeric chain IDs).

## Other bridge options

- **[LayerZero](https://layerzero.network/)** — `OApp` / `Endpoint`; common for NFT / `OFT`.
- **Wormhole, Axelar, Hyperlane** — same general pattern: trusted receiver + payload codec; you can mirror `MirrorPayloadCodec`’s layout in another adapter.

## Chain IDs (reference)

| Network | Chain ID |
|---------|----------|
| Arbitrum One | `42161` |
| Arbitrum Sepolia | `421614` |
| Avalanche C-Chain | `43114` |
| Avalanche Fuji | `43113` |

## Ordering and failures

- Bridges may deliver messages **out of order** unless you use **ordered channels** or enforce **sequence numbers** in your app. This mirror contract does **not** reorder; design the **sender** (or off-chain relayer) so `CtfCreated` arrives before `Resolved`, or add a higher-level nonce per `ctfId` in a future version.
- If a message fails, most stacks support **manual execution** or retry — operational runbooks belong with the bridge you pick.

## World ID & NFTs on two chains

- **World ID** verification is **per chain** unless you use their cross-chain story; many products **mint Competitor NFT on one chain** or deploy **separate** verifiers per chain.
- **NFT bridging** often uses **OFT** (LayerZero) or lock-and-mint patterns — plan explicitly; do not assume `transferFrom` mirrors automatically.

## Next implementation steps (engineering checklist)

**Default policy:** CTFLand treats **`NEXT_PUBLIC_CHAIN_ID`** as the **canonical** chain for `Registry` + **`CCIPRegistryPassport`** (see [`CCIP_DEPLOYMENT.md`](CCIP_DEPLOYMENT.md)); the **peer** protocol chain is the **mirror** (`RegistryMirror` + receiver).

1. Pick **canonical** chain for Registry **writes** that must be authoritative first (documented in [`CCIP_DEPLOYMENT.md`](CCIP_DEPLOYMENT.md)).
2. On the **mirror** chain: deploy **`RegistryMirror`**, deploy **`CCIPRegistryMirrorReceiver(router, registryMirror, owner)`** with that chain’s [CCIP router](https://docs.chain.link/ccip), then **`registryMirror.setTrustedRemoteExecutor(receiver)`** — Forge: **`DeployCCIPMirrorStack.s.sol`**.
3. **`receiver.setPeer(...)`** with the source chain selector and the canonical **sender** contract address — Forge: **`ConfigureCCIPMirrorReceiverPeer.s.sol`**.
4. On **canonical** chain: deploy **`CCIPRegistryPassport`** (`DeployCCIPCanonicalPassport.s.sol`) and wire **`ccipSend`** after each mirrored lifecycle event (or via ops UI on **`/mirror`**) using **`MirrorPayloadCodec`** payloads and native fee via **`quoteSendFee`** / `msg.value` (see CCIP docs for fee tokens).
5. Monitor: failed CCIP executions, underfunded sends, and off-order delivery if you disallow out-of-order messages on the lane — bullets in [`CCIP_DEPLOYMENT.md`](CCIP_DEPLOYMENT.md).

---

You did not say anything wrong — **dual deployment + cross-messaging** is exactly how serious multi-chain apps are built; the constraints are **asynchrony** and **clear separation** between **message state** and **native value**.
