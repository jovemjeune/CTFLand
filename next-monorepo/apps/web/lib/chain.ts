import { arbitrumSepolia, avalancheFuji } from "viem/chains"
import type { Chain } from "viem"

/**
 * CTFLand protocol testnets only — matches on-chain deployments (see `foundry/`).
 * Wagmi is configured with exactly these chains so the app never targets mainnets or unrelated testnets.
 * **Avalanche Fuji is listed first** so it is the default “primary” network in wallet UIs; Arbitrum Sepolia remains fully supported.
 */
export const CTF_PROTOCOL_CHAINS = [avalancheFuji, arbitrumSepolia] as const

const byId = new Map<number, Chain>(
  CTF_PROTOCOL_CHAINS.map((c) => [c.id, c]),
)

/** Default when `NEXT_PUBLIC_CHAIN_ID` is missing or invalid — Avalanche Fuji. */
const DEFAULT_CHAIN_ID = 43113

export const PROTOCOL_CHAIN_IDS = new Set<number>(
  CTF_PROTOCOL_CHAINS.map((c) => c.id),
)

export function isProtocolChainId(chainId: number): boolean {
  return PROTOCOL_CHAIN_IDS.has(chainId)
}

/** Chains passed to `createConfig` (same set the protocol supports). */
export function getAppChains(): readonly [Chain, Chain] {
  return CTF_PROTOCOL_CHAINS
}

/**
 * Primary chain for env-driven reads (Registry, Competitor NFT). Must be one of
 * {@link CTF_PROTOCOL_CHAINS}.
 */
export function getAppChain(): Chain {
  const id = Number(process.env.NEXT_PUBLIC_CHAIN_ID || DEFAULT_CHAIN_ID)
  return byId.get(id) ?? avalancheFuji
}

/** The other CTFLand protocol testnet (Fuji ↔ Arbitrum Sepolia) for CCIP / mirror reads. */
export function getPeerProtocolChain(): Chain {
  const primary = getAppChain()
  const other = CTF_PROTOCOL_CHAINS.find((c) => c.id !== primary.id)
  return other ?? primary
}

/**
 * RPC: when `NEXT_PUBLIC_RPC_URL` is set, it applies only to the chain matching
 * `NEXT_PUBLIC_CHAIN_ID` (primary). The other protocol chain uses viem defaults.
 */
export function getDefaultRpcUrl(chain: Chain): string {
  const fromEnv = process.env.NEXT_PUBLIC_RPC_URL
  const primaryId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || DEFAULT_CHAIN_ID)
  if (fromEnv && chain.id === primaryId) return fromEnv
  return chain.rpcUrls.default.http[0] ?? ""
}
