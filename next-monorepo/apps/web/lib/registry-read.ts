import { createPublicClient, http, type Address } from "viem"

import { getAppChain, getDefaultRpcUrl } from "@/lib/chain"
import { getRegistryAddressForApp } from "@/lib/deployed-addresses"
import { registryAbi } from "@/lib/registry-abi"

export type RegistrySnapshot =
  | {
      ok: true
      address: Address
      chainId: number
      bps: {
        denominator: bigint
        withTriage: {
          competitors: bigint
          judges: bigint
          triage: bigint
          treasury: bigint
        }
        noTriage: {
          competitors: bigint
          judges: bigint
          treasury: bigint
        }
        punishParticipantBps: bigint
      }
      sponsorNFT: Address
      triageNFT: Address
      competitorNFT: Address
      protocolTreasury: Address
    }
  | { ok: false; reason: "missing_registry" | "rpc_error"; detail?: string }

export async function fetchRegistrySnapshot(): Promise<RegistrySnapshot> {
  const resolved = getRegistryAddressForApp()
  if (!resolved) {
    return { ok: false, reason: "missing_registry" }
  }
  const address = resolved
  const chain = getAppChain()
  const rpc = getDefaultRpcUrl(chain)
  const client = createPublicClient({
    chain,
    transport: http(rpc),
  })

  try {
    const [
      denominator,
      competitorsWithTriage,
      judgesWithTriage,
      triageWithTriage,
      treasuryWithTriage,
      competitorsNoTriage,
      judgesNoTriage,
      treasuryNoTriage,
      punishParticipantBps,
      sponsorNFT,
      triageNFT,
      competitorNFT,
      protocolTreasury,
    ] = await Promise.all([
      client.readContract({
        address,
        abi: registryAbi,
        functionName: "BPS_DENOMINATOR",
      }),
      client.readContract({
        address,
        abi: registryAbi,
        functionName: "BPS_COMPETITORS_WITH_TRIAGE",
      }),
      client.readContract({
        address,
        abi: registryAbi,
        functionName: "BPS_JUDGES_WITH_TRIAGE",
      }),
      client.readContract({
        address,
        abi: registryAbi,
        functionName: "BPS_TRIAGE_WITH_TRIAGE",
      }),
      client.readContract({
        address,
        abi: registryAbi,
        functionName: "BPS_TREASURY_WITH_TRIAGE",
      }),
      client.readContract({
        address,
        abi: registryAbi,
        functionName: "BPS_COMPETITORS_NO_TRIAGE",
      }),
      client.readContract({
        address,
        abi: registryAbi,
        functionName: "BPS_JUDGES_NO_TRIAGE",
      }),
      client.readContract({
        address,
        abi: registryAbi,
        functionName: "BPS_TREASURY_NO_TRIAGE",
      }),
      client.readContract({
        address,
        abi: registryAbi,
        functionName: "PUNISH_PARTICIPANT_BPS",
      }),
      client.readContract({
        address,
        abi: registryAbi,
        functionName: "sponsorNFT",
      }),
      client.readContract({
        address,
        abi: registryAbi,
        functionName: "triageNFT",
      }),
      client.readContract({
        address,
        abi: registryAbi,
        functionName: "competitorNFT",
      }),
      client.readContract({
        address,
        abi: registryAbi,
        functionName: "protocolTreasury",
      }),
    ])

    return {
      ok: true,
      address,
      chainId: chain.id,
      bps: {
        denominator,
        withTriage: {
          competitors: competitorsWithTriage,
          judges: judgesWithTriage,
          triage: triageWithTriage,
          treasury: treasuryWithTriage,
        },
        noTriage: {
          competitors: competitorsNoTriage,
          judges: judgesNoTriage,
          treasury: treasuryNoTriage,
        },
        punishParticipantBps,
      },
      sponsorNFT,
      triageNFT,
      competitorNFT,
      protocolTreasury,
    }
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e)
    return { ok: false, reason: "rpc_error", detail }
  }
}
