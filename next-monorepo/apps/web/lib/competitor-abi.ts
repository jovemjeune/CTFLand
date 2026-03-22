/** CompetitorNFT — align with `foundry/src/CompetitorNFT.sol` */
export const competitorNftAbi = [
  {
    type: "function",
    name: "claimWithWorldId",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "root", type: "uint256" },
      { name: "nullifierHash", type: "uint256" },
      { name: "proof", type: "uint256[8]" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "tokenNullifier",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
] as const
