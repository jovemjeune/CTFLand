import type { PublicClient } from "viem"
import type { Address } from "viem"

import { registryAbi } from "@/lib/registry-abi"

/** Result of choosing the next unused CTF id. */
export type NextCtfIdSuggestion = {
  /** Highest `ctfId` seen in `CtfCreated` logs (0 if none or unknown). */
  maxId: bigint
  /** First unused ID (max + 1 from logs, or time-based), verified with `ctfCreationTime`. */
  nextId: bigint
  /** Number of `CtfCreated` events observed while scanning logs. */
  ctfCreatedCount: number
  /** How we picked the id — explains UI copy. */
  source: "events" | "timestamp"
}

/** Fuji / many public RPCs cap `eth_getLogs` to 2048 blocks per request. */
const LOG_CHUNK_BLOCKS = 2048n

const UNIQUENESS_SCAN_CAP = 512

/**
 * Registry deployment block for log scans — avoids full-chain `eth_getLogs` (RPC rejects huge ranges).
 * Use explicit env vars (Next only inlines static `NEXT_PUBLIC_*` access in the client bundle).
 */
function getRegistryDeployBlock(chainId: number): bigint | undefined {
  const specific =
    chainId === 43113
      ? process.env.NEXT_PUBLIC_REGISTRY_DEPLOY_BLOCK_43113?.trim()
      : chainId === 421614
        ? process.env.NEXT_PUBLIC_REGISTRY_DEPLOY_BLOCK_421614?.trim()
        : undefined
  if (specific && /^\d+$/.test(specific)) {
    try {
      return BigInt(specific)
    } catch {
      /* fall through */
    }
  }
  const raw = process.env.NEXT_PUBLIC_REGISTRY_DEPLOY_BLOCK?.trim()
  if (!raw || !/^\d+$/.test(raw)) return undefined
  try {
    return BigInt(raw)
  } catch {
    return undefined
  }
}

function uniqueTimestampCandidate(): bigint {
  const ms = BigInt(Date.now())
  const salt = BigInt(Math.floor(Math.random() * 1_000_000))
  return ms * 1_000_000n + salt
}

async function findFirstUnused(
  publicClient: PublicClient,
  registryAddress: Address,
  start: bigint,
): Promise<bigint> {
  let candidate = start
  for (let i = 0; i < UNIQUENESS_SCAN_CAP; i++) {
    const t = await publicClient.readContract({
      address: registryAddress,
      abi: registryAbi,
      functionName: "ctfCreationTime",
      args: [candidate],
    })
    if (t === 0n) return candidate
    candidate += 1n
  }
  throw new Error(
    "Could not find an unused CTF ID (scan limit reached). Try again in a moment.",
  )
}

/**
 * Scan `CtfCreated` in `[fromBlock, toBlock]` using ≤2048-block chunks (public RPC safe).
 */
async function scanCtfCreatedMax(
  publicClient: PublicClient,
  registryAddress: Address,
  fromBlock: bigint,
  toBlock: bigint,
): Promise<{ maxId: bigint; ctfCreatedCount: number }> {
  let maxId = 0n
  let ctfCreatedCount = 0
  let from = fromBlock
  while (from <= toBlock) {
    const to =
      from + LOG_CHUNK_BLOCKS - 1n > toBlock ? toBlock : from + LOG_CHUNK_BLOCKS - 1n
    const events = await publicClient.getContractEvents({
      address: registryAddress,
      abi: registryAbi,
      eventName: "CtfCreated",
      fromBlock: from,
      toBlock: to,
    })
    ctfCreatedCount += events.length
    for (const log of events) {
      const id = log.args.ctfId
      if (typeof id === "bigint" && id > maxId) maxId = id
    }
    from = to + 1n
  }
  return { maxId, ctfCreatedCount }
}

/**
 * Next unused CTF id:
 * - **events**: chunked log scan from the Registry deploy block through `latest`, then max+1 verified.
 * - **timestamp** (fallback): if deploy block is not set, public RPCs cannot scan history — use a high-entropy id and verify unused (no manual input).
 */
export async function suggestNextCtfId(
  publicClient: PublicClient,
  registryAddress: Address,
  chainId: number,
): Promise<NextCtfIdSuggestion> {
  const latest = await publicClient.getBlockNumber()
  const deployBlock = getRegistryDeployBlock(chainId)

  if (deployBlock === undefined) {
    const seed = uniqueTimestampCandidate()
    const nextId = await findFirstUnused(publicClient, registryAddress, seed)
    return {
      maxId: 0n,
      nextId,
      ctfCreatedCount: 0,
      source: "timestamp",
    }
  }

  if (deployBlock > latest) {
    throw new Error(
      "Registry deploy block is greater than latest block — fix NEXT_PUBLIC_REGISTRY_DEPLOY_BLOCK* in env.",
    )
  }

  const { maxId, ctfCreatedCount } = await scanCtfCreatedMax(
    publicClient,
    registryAddress,
    deployBlock,
    latest,
  )

  const start = maxId + 1n
  const nextId = await findFirstUnused(publicClient, registryAddress, start)

  return {
    maxId,
    nextId,
    ctfCreatedCount,
    source: "events",
  }
}
