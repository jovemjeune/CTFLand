/** Block explorer URLs for protocol testnets (matches `lib/chain.ts`). */
export function explorerTxUrl(chainId: number, txHash: string): string | undefined {
  if (chainId === 43113) {
    return `https://testnet.snowtrace.io/tx/${txHash}`
  }
  if (chainId === 421614) {
    return `https://sepolia.arbiscan.io/tx/${txHash}`
  }
  return undefined
}
