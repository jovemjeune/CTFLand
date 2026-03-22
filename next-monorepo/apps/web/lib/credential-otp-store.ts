import type { Address } from "viem"

import type { CredentialRole } from "@/lib/credential-message"

type OtpEntry = {
  code: string
  expiresAt: number
}

const OTP_TTL_MS = 10 * 60 * 1000

function key(role: CredentialRole, wallet: Address): string {
  return `${role}:${wallet.toLowerCase()}`
}

const pending = new Map<string, OtpEntry>()

export function setOtp(
  role: CredentialRole,
  wallet: Address,
  code: string,
): void {
  pending.set(key(role, wallet), {
    code,
    expiresAt: Date.now() + OTP_TTL_MS,
  })
}

export function verifyAndClearOtp(
  role: CredentialRole,
  wallet: Address,
  code: string,
): boolean {
  const k = key(role, wallet)
  const e = pending.get(k)
  if (!e) return false
  if (Date.now() > e.expiresAt) {
    pending.delete(k)
    return false
  }
  if (e.code !== code.trim()) return false
  pending.delete(k)
  return true
}
