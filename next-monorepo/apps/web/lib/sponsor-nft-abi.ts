/** Minimal SponsorNFT ABI — onboarding + event for success UI. */
export const sponsorNftAbi = [
  {
    type: "function",
    name: "becomeSponsorWithNativeToken",
    stateMutability: "payable",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "ctfId", type: "uint256" },
      { name: "supportsTriage", type: "bool" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    type: "event",
    name: "SponsorOnboarded",
    inputs: [
      { name: "sponsor", type: "address", indexed: true },
      { name: "ctfId", type: "uint256", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "collateral", type: "uint256", indexed: false },
    ],
  },
] as const
