import { getAddress, type Address } from "viem"

import { getAppChain, getPeerProtocolChain } from "@/lib/chain"

import contractAddresses from "./contract-addresses.json"

type ChainRow = Record<string, string | undefined>

const chains = contractAddresses.chains as Record<string, ChainRow>

function envOrDeployed(
  envKey: string,
  chainId: number,
  jsonKey: string,
): Address | undefined {
  const fromEnv = process.env[envKey]
  if (
    typeof fromEnv === "string" &&
    fromEnv.startsWith("0x") &&
    fromEnv.length >= 42
  ) {
    return getAddress(fromEnv as Address)
  }
  const raw = chains[String(chainId)]?.[jsonKey]
  if (typeof raw === "string" && raw.startsWith("0x") && raw.length >= 42) {
    return getAddress(raw as Address)
  }
  return undefined
}

/** Registry for the app’s primary chain (`NEXT_PUBLIC_CHAIN_ID`). Env overrides JSON. */
export function getRegistryAddressForApp(): Address | undefined {
  return envOrDeployed(
    "NEXT_PUBLIC_REGISTRY_ADDRESS",
    getAppChain().id,
    "Registry",
  )
}

/** Competitor NFT for the app’s primary chain. Env overrides JSON. */
export function getCompetitorNftAddressForApp(): Address | undefined {
  return envOrDeployed(
    "NEXT_PUBLIC_COMPETITOR_NFT_ADDRESS",
    getAppChain().id,
    "CompetitorNFT",
  )
}

/** Sponsor NFT for the app’s primary chain (CTF creation + credential mint). Env overrides JSON. */
export function getSponsorNftAddressForApp(): Address | undefined {
  return envOrDeployed(
    "NEXT_PUBLIC_SPONSOR_NFT_ADDRESS",
    getAppChain().id,
    "SponsorNFT",
  )
}

/** Triage NFT — env overrides `contract-addresses.json`. */
export function getTriageNftAddressForApp(): Address | undefined {
  return envOrDeployed(
    "NEXT_PUBLIC_TRIAGE_NFT_ADDRESS",
    getAppChain().id,
    "TriageNFT",
  )
}

/** Judge NFT — env overrides `contract-addresses.json`. */
export function getJudgeNftAddressForApp(): Address | undefined {
  return envOrDeployed(
    "NEXT_PUBLIC_JUDGE_NFT_ADDRESS",
    getAppChain().id,
    "JudgeNFT",
  )
}

/**
 * `RegistryMirror` on the **peer** chain (not `NEXT_PUBLIC_CHAIN_ID`) — where CCIP delivers read-only CTF state.
 * Env `NEXT_PUBLIC_REGISTRY_MIRROR_ADDRESS` overrides JSON `RegistryMirror` for that peer chain.
 */
export function getRegistryMirrorAddressOnPeerChain(): Address | undefined {
  const peer = getPeerProtocolChain()
  return envOrDeployed(
    "NEXT_PUBLIC_REGISTRY_MIRROR_ADDRESS",
    peer.id,
    "RegistryMirror",
  )
}

/**
 * `CCIPRegistryPassport` on the **app primary** chain (canonical sender for CCIP). Env overrides JSON `CCIPRegistryPassport`.
 */
export function getCcipRegistryPassportAddress(): Address | undefined {
  return envOrDeployed(
    "NEXT_PUBLIC_CCIP_REGISTRY_PASSPORT_ADDRESS",
    getAppChain().id,
    "CCIPRegistryPassport",
  )
}

/**
 * `CCIPRegistryMirrorReceiver` on the **peer** chain — CCIP delivers to this contract, which updates `RegistryMirror`.
 * Env overrides JSON `CCIPRegistryMirrorReceiver` for that peer chain.
 */
export function getCcipRegistryMirrorReceiverAddress(): Address | undefined {
  const peer = getPeerProtocolChain()
  return envOrDeployed(
    "NEXT_PUBLIC_CCIP_REGISTRY_MIRROR_RECEIVER_ADDRESS",
    peer.id,
    "CCIPRegistryMirrorReceiver",
  )
}

/** `ProtocolTreasuryVault` address for a specific protocol chain (from JSON or `NEXT_PUBLIC_PROTOCOL_TREASURY_<chainId>`). */
export function getProtocolTreasuryAddressForChain(
  chainId: number,
): Address | undefined {
  const per = process.env[`NEXT_PUBLIC_PROTOCOL_TREASURY_${chainId}`]
  if (
    typeof per === "string" &&
    per.startsWith("0x") &&
    per.length >= 42
  ) {
    return getAddress(per as Address)
  }
  const raw = chains[String(chainId)]?.ProtocolTreasury
  if (typeof raw === "string" && raw.startsWith("0x") && raw.length >= 42) {
    return getAddress(raw as Address)
  }
  return undefined
}
