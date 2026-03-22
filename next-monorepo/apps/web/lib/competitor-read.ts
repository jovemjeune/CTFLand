import type { Address, PublicClient } from "viem"
import { parseAbiItem } from "viem"

/** Latest token received by `owner` (simple Transfer scan). */
export async function fetchCompetitorTokenId(
  client: PublicClient,
  nft: Address,
  owner: Address,
): Promise<bigint | null> {
  const logs = await client.getLogs({
    address: nft,
    event: parseAbiItem(
      "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
    ),
    args: { to: owner },
    fromBlock: 0n,
    toBlock: "latest",
  })
  if (logs.length === 0) return null
  const last = logs[logs.length - 1]!
  const tid = last.args.tokenId
  if (tid === undefined) return null
  return tid
}
