import { randomBytes } from "node:crypto"

import { getAddress, type Address } from "viem"
import { NextResponse } from "next/server"

import {
  type CredentialRole,
  buildCredentialMessage,
} from "@/lib/credential-message"
import {
  CREDENTIAL_CHALLENGE_TTL_MS,
  createNonceRecord,
} from "@/lib/credential-nonce-store"
import { getCredentialChain } from "@/lib/credential-server"

function parseRole(raw: unknown): CredentialRole | undefined {
  return raw === "triage" || raw === "judge" ? raw : undefined
}

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }
  const b = body as Record<string, unknown>
  const role = parseRole(b.role)
  const walletRaw = typeof b.address === "string" ? b.address : ""
  if (!role) {
    return NextResponse.json(
      { error: "role must be \"triage\" or \"judge\"." },
      { status: 400 },
    )
  }
  let wallet: Address
  try {
    wallet = getAddress(walletRaw as Address)
  } catch {
    return NextResponse.json({ error: "Invalid wallet address." }, { status: 400 })
  }

  const chain = getCredentialChain()
  const nonce = randomBytes(16).toString("hex")
  const expiresAt = Date.now() + CREDENTIAL_CHALLENGE_TTL_MS
  createNonceRecord({ nonce, role, wallet, expiresAt })

  const message = buildCredentialMessage({
    chainId: chain.id,
    role,
    wallet,
    nonce,
    expiresAt,
  })

  return NextResponse.json({
    nonce,
    expiresAt,
    chainId: chain.id,
    message,
  })
}
