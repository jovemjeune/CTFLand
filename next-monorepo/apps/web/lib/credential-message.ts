import type { Address } from "viem"

export type CredentialRole = "triage" | "judge"

export function buildCredentialMessage(params: {
  chainId: number
  role: CredentialRole
  wallet: Address
  nonce: string
  expiresAt: number
}): string {
  return [
    "CTFLand credential verification",
    "version: 1",
    `chainId: ${params.chainId}`,
    `role: ${params.role}`,
    `wallet: ${params.wallet}`,
    `nonce: ${params.nonce}`,
    `expires: ${params.expiresAt}`,
  ].join("\n")
}
