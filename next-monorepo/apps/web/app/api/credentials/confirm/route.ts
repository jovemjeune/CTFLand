import { getAddress, type Address } from "viem"
import { NextResponse } from "next/server"

import type { CredentialRole } from "@/lib/credential-message"
import { verifyAndClearOtp } from "@/lib/credential-otp-store"
import {
  alreadyHasCredential,
  getNftAddress,
  mintCredentialVerified,
} from "@/lib/credential-server"

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
  const otp = typeof b.otp === "string" ? b.otp : ""
  const walletRaw = typeof b.address === "string" ? b.address : ""

  if (!role || !otp) {
    return NextResponse.json(
      { error: "role, address, and otp are required." },
      { status: 400 },
    )
  }

  let wallet: Address
  try {
    wallet = getAddress(walletRaw as Address)
  } catch {
    return NextResponse.json({ error: "Invalid wallet address." }, { status: 400 })
  }

  if (!getNftAddress(role)) {
    return NextResponse.json(
      { error: "NFT contract address is not configured for this chain." },
      { status: 503 },
    )
  }

  if (!verifyAndClearOtp(role, wallet, otp)) {
    return NextResponse.json(
      { error: "Invalid or expired OTP. Start verification again." },
      { status: 400 },
    )
  }

  try {
    if (await alreadyHasCredential(role, wallet)) {
      return NextResponse.json({
        ok: true,
        alreadyVerified: true,
        address: wallet,
      })
    }
  } catch {
    /* fall through to mint attempt */
  }

  try {
    const txHash = await mintCredentialVerified(role, wallet)
    return NextResponse.json({
      ok: true,
      alreadyVerified: false,
      address: wallet,
      txHash,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Mint failed."
    return NextResponse.json(
      {
        error: msg.includes("VERIFIER_PRIVATE_KEY")
          ? "Server verifier key is not configured (VERIFIER_PRIVATE_KEY)."
          : msg,
      },
      { status: 503 },
    )
  }
}
