import { arbitrumSepolia, avalancheFuji } from "viem/chains"

/**
 * Chainlink CCIP chain selectors (testnets). Verify in
 * [CCIP directory](https://docs.chain.link/ccip/directory/testnet) before production.
 */
/** @see [CCIP directory — Arbitrum Sepolia](https://docs.chain.link/ccip/directory/testnet/chain/ethereum-testnet-sepolia-arbitrum-1) */
export const CCIP_CHAIN_SELECTOR_ARBITRUM_SEPOLIA = 3478487238524512106n
export const CCIP_CHAIN_SELECTOR_AVALANCHE_FUJI = 14767482510784806043n

/** CCIP chain selector for a protocol chain ID (source or destination in docs). */
export function ccipChainSelectorForChainId(chainId: number): bigint {
  if (chainId === avalancheFuji.id) return CCIP_CHAIN_SELECTOR_AVALANCHE_FUJI
  if (chainId === arbitrumSepolia.id) return CCIP_CHAIN_SELECTOR_ARBITRUM_SEPOLIA
  return CCIP_CHAIN_SELECTOR_ARBITRUM_SEPOLIA
}

/** Destination selector when the app primary chain is `chainId` (peer for mirroring). */
export function ccipPeerChainSelector(primaryChainId: number): bigint {
  if (primaryChainId === avalancheFuji.id) return CCIP_CHAIN_SELECTOR_ARBITRUM_SEPOLIA
  if (primaryChainId === arbitrumSepolia.id) return CCIP_CHAIN_SELECTOR_AVALANCHE_FUJI
  return CCIP_CHAIN_SELECTOR_ARBITRUM_SEPOLIA
}
