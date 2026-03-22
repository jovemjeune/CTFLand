/** Minimal `RegistryMirror` reads for the cross-chain passport UI. */
export const registryMirrorAbi = [
  {
    type: "function",
    name: "trustedRemoteExecutor",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "ctfCreationTime",
    stateMutability: "view",
    inputs: [{ name: "ctfId", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "ctfResolved",
    stateMutability: "view",
    inputs: [{ name: "ctfId", type: "uint256" }],
    outputs: [{ type: "bool" }],
  },
] as const
