import { decodeAbiParameters, hexToBytes } from "viem"

import type { ISuccessResult } from "@worldcoin/idkit"

export type ProofTuple = readonly [
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
]

function toTuple8(arr: bigint[]): ProofTuple {
  if (arr.length !== 8) throw new Error("expected 8 uint256 values")
  return [
    arr[0]!,
    arr[1]!,
    arr[2]!,
    arr[3]!,
    arr[4]!,
    arr[5]!,
    arr[6]!,
    arr[7]!,
  ]
}

/**
 * Decode IDKit `proof` (hex) to the on-chain `uint256[8]` expected by `IWorldID.verifyProof`.
 * Tries ABI-encoded proof first, then falls back to 8×32-byte chunks.
 */
export function decodeWorldProof(proofHex: string): ProofTuple {
  const hex = proofHex.startsWith("0x") ? proofHex : `0x${proofHex}`

  try {
    const decoded = decodeAbiParameters(
      [{ type: "uint256[8]" }],
      hex as `0x${string}`,
    )
    const raw = decoded[0]
    return toTuple8(Array.from(raw as readonly bigint[]))
  } catch {
    const bytes = hexToBytes(hex as `0x${string}`)
    if (bytes.length !== 8 * 32) {
      throw new Error(
        `Invalid World ID proof length: ${bytes.length} bytes (expected 256)`,
      )
    }
    const out: bigint[] = []
    for (let i = 0; i < 8; i++) {
      const slice = bytes.subarray(i * 32, (i + 1) * 32)
      let n = 0n
      for (let j = 0; j < 32; j++) {
        n = (n << 8n) + BigInt(slice[j]!)
      }
      out.push(n)
    }
    return toTuple8(out)
  }
}

export function parseWorldIdSuccess(result: ISuccessResult) {
  const root = BigInt(result.merkle_root)
  const nullifierHash = BigInt(result.nullifier_hash)
  const proof = decodeWorldProof(result.proof)
  return { root, nullifierHash, proof }
}
