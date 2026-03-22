/** Minimal reads for `CCIPRegistryMirrorReceiver` (mirror chain). */
export const ccipRegistryMirrorReceiverAbi = [
  {
    type: "function",
    name: "allowedSourceChainSelector",
    stateMutability: "view",
    inputs: [{ name: "sourceChainSelector", type: "uint64" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "allowedSourceSender",
    stateMutability: "view",
    inputs: [{ name: "sourceChainSelector", type: "uint64" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "registryMirror",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
] as const
