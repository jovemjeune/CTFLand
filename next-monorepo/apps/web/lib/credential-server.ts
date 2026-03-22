import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Chain,
} from "viem"
import { privateKeyToAccount } from "viem/accounts"

import { getAppChain, getDefaultRpcUrl } from "@/lib/chain"
import {
  getJudgeNftAddressForApp,
  getTriageNftAddressForApp,
} from "@/lib/deployed-addresses"
import { judgeNftAbi, triageNftAbi } from "@/lib/triage-judge-abi"

import type { CredentialRole } from "@/lib/credential-message"

function requireVerifierKey(): `0x${string}` {
  const raw = process.env.VERIFIER_PRIVATE_KEY
  if (!raw || typeof raw !== "string") {
    throw new Error("VERIFIER_PRIVATE_KEY is not configured.")
  }
  return (raw.startsWith("0x") ? raw : `0x${raw}`) as `0x${string}`
}

export function getCredentialChain(): Chain {
  return getAppChain()
}

export function getPublicClient() {
  const chain = getCredentialChain()
  return createPublicClient({
    chain,
    transport: http(getDefaultRpcUrl(chain)),
  })
}

export function getNftAddress(role: CredentialRole): Address | undefined {
  return role === "triage"
    ? getTriageNftAddressForApp()
    : getJudgeNftAddressForApp()
}

export async function alreadyHasCredential(
  role: CredentialRole,
  wallet: Address,
): Promise<boolean> {
  const nft = getNftAddress(role)
  if (!nft) return false
  const client = getPublicClient()
  if (role === "triage") {
    return client.readContract({
      address: nft,
      abi: triageNftAbi,
      functionName: "isTriageMember",
      args: [wallet],
    })
  }
  return client.readContract({
    address: nft,
    abi: judgeNftAbi,
    functionName: "isJudgeMember",
    args: [wallet],
  })
}

export async function mintCredentialVerified(
  role: CredentialRole,
  to: Address,
): Promise<`0x${string}`> {
  const nft = getNftAddress(role)
  if (!nft) {
    throw new Error("NFT contract address is not configured for this chain.")
  }
  const chain = getCredentialChain()
  const account = privateKeyToAccount(requireVerifierKey())
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(getDefaultRpcUrl(chain)),
  })
  if (role === "triage") {
    return walletClient.writeContract({
      address: nft,
      abi: triageNftAbi,
      functionName: "mintTriageVerified",
      args: [to],
    })
  }
  return walletClient.writeContract({
    address: nft,
    abi: judgeNftAbi,
    functionName: "mintJudgeVerified",
    args: [to],
  })
}
