import { encodeAbiParameters, type Hex } from "viem"

/** Mirrors `foundry/src/crosschain/MirrorPayloadCodec.sol` for client-side `quoteSendFee` / tx data. */
const OP_CTF_CREATED = 0
const OP_MARK_FINISHED = 1
const OP_RESOLVED = 2

export function encodeMirrorCtfCreated(
  ctfId: bigint,
  creationTime: bigint,
  supportsTriage: boolean,
  sponsor: `0x${string}`,
): Hex {
  const inner = encodeAbiParameters(
    [
      { type: "uint256" },
      { type: "uint256" },
      { type: "bool" },
      { type: "address" },
    ],
    [ctfId, creationTime, supportsTriage, sponsor],
  )
  return encodeAbiParameters(
    [{ type: "uint8" }, { type: "bytes" }],
    [OP_CTF_CREATED, inner],
  ) as Hex
}

export function encodeMirrorMarkFinished(ctfId: bigint): Hex {
  const inner = encodeAbiParameters([{ type: "uint256" }], [ctfId])
  return encodeAbiParameters(
    [{ type: "uint8" }, { type: "bytes" }],
    [OP_MARK_FINISHED, inner],
  ) as Hex
}

export function encodeMirrorResolved(
  ctfId: bigint,
  kind: number,
  outcomeInnerPayload: Hex,
): Hex {
  const inner = encodeAbiParameters(
    [
      { type: "uint256" },
      { type: "uint8" },
      { type: "bytes" },
    ],
    [ctfId, kind, outcomeInnerPayload],
  )
  return encodeAbiParameters(
    [{ type: "uint8" }, { type: "bytes" }],
    [OP_RESOLVED, inner],
  ) as Hex
}

/** Default empty outcome tuple: `abi.encode([], [], address(0), address(0))` */
export function encodeDefaultOutcomeInner(): Hex {
  return encodeAbiParameters(
    [
      { type: "bytes32[]" },
      { type: "address[]" },
      { type: "address" },
      { type: "address" },
    ],
    [[], [], "0x0000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000"],
  ) as Hex
}
