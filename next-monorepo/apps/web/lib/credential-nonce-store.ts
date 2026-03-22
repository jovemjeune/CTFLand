import type { Address } from "viem"

import type { CredentialRole } from "@/lib/credential-message"

type NonceEntry = {
  role: CredentialRole
  wallet: Address
  expiresAt: number
}

export const CREDENTIAL_CHALLENGE_TTL_MS = 15 * 60 * 1000

/** In-memory nonce store (single Node process; resets on cold start). */
const nonces = new Map<string, NonceEntry>()

export function createNonceRecord(params: {
  nonce: string
  role: CredentialRole
  wallet: Address
  expiresAt: number
}): void {
  nonces.set(params.nonce, {
    role: params.role,
    wallet: params.wallet,
    expiresAt: params.expiresAt,
  })
}

export function consumeNonceRecord(
  nonce: string,
): NonceEntry | undefined {
  const e = nonces.get(nonce)
  if (!e) return undefined
  if (Date.now() > e.expiresAt) {
    nonces.delete(nonce)
    return undefined
  }
  nonces.delete(nonce)
  return e
}

export function peekNonceRecord(nonce: string): NonceEntry | undefined {
  const e = nonces.get(nonce)
  if (!e) return undefined
  if (Date.now() > e.expiresAt) {
    nonces.delete(nonce)
    return undefined
  }
  return e
}

export function deleteNonce(nonce: string): void {
  nonces.delete(nonce)
}
