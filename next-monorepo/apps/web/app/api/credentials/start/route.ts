import { verifyMessage, type Hex } from "viem"
import { NextResponse } from "next/server"

import {
  type CredentialRole,
  buildCredentialMessage,
} from "@/lib/credential-message"
import {
  deleteNonce,
  peekNonceRecord,
} from "@/lib/credential-nonce-store"
import { setOtp } from "@/lib/credential-otp-store"
import {
  type CredentialProfilePayload,
  validateCredentialProfile,
} from "@/lib/credential-validation"
import {
  alreadyHasCredential,
  getCredentialChain,
  getNftAddress,
} from "@/lib/credential-server"

function parseRole(raw: unknown): CredentialRole | undefined {
  return raw === "triage" || raw === "judge" ? raw : undefined
}

function generateOtp(): string {
  return String(Math.floor(100_000 + Math.random() * 900_000))
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
  const nonce = typeof b.nonce === "string" ? b.nonce : ""
  const signature = typeof b.signature === "string" ? (b.signature as Hex) : undefined
  const profile = b.profile as CredentialProfilePayload | undefined

  if (!role || !nonce || !signature) {
    return NextResponse.json(
      { error: "role, nonce, and signature are required." },
      { status: 400 },
    )
  }

  const entry = peekNonceRecord(nonce)
  if (!entry || entry.role !== role) {
    return NextResponse.json(
      { error: "Unknown or expired challenge nonce. Request a new challenge." },
      { status: 400 },
    )
  }

  const chain = getCredentialChain()

  const message = buildCredentialMessage({
    chainId: chain.id,
    role: entry.role,
    wallet: entry.wallet,
    nonce,
    expiresAt: entry.expiresAt,
  })

  const valid = await verifyMessage({
    address: entry.wallet,
    message,
    signature,
  })
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 })
  }

  if (!getNftAddress(role)) {
    return NextResponse.json(
      {
        error:
          "NFT contract address is not configured. Set NEXT_PUBLIC_TRIAGE_NFT_ADDRESS / NEXT_PUBLIC_JUDGE_NFT_ADDRESS or deploy entries in contract-addresses.json.",
      },
      { status: 503 },
    )
  }

  const has = await alreadyHasCredential(role, entry.wallet)
  if (has) {
    deleteNonce(nonce)
    return NextResponse.json({
      ok: true,
      alreadyVerified: true,
      address: entry.wallet,
    })
  }

  const v = validateCredentialProfile(role, profile)
  if (!v.ok) {
    return NextResponse.json({ error: v.reason }, { status: 400 })
  }

  const code = generateOtp()
  setOtp(role, entry.wallet, code)
  deleteNonce(nonce)

  const demo =
    process.env.CREDENTIALS_DEMO_REVEAL_OTP === "true" ||
    process.env.CREDENTIALS_DEMO_REVEAL_OTP === "1"

  return NextResponse.json({
    ok: true,
    alreadyVerified: false,
    address: entry.wallet,
    /** Real X/Twitter DM delivery requires the X API; demo shows the code when enabled. */
    otpDelivery: "manual",
    ...(demo ? { demoOtp: code } : {}),
  })
}
