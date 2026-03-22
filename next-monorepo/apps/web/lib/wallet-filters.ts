import type { Connector } from "wagmi"

/**
 * CTFLand targets EVM on **Arbitrum & Avalanche** only. Phantom is primarily Solana;
 * when it appears as an injected EIP-6963 entry it breaks or confuses EVM flows — exclude it.
 */
export function isExcludedInjectedWallet(connector: Pick<Connector, "id" | "name">): boolean {
  const id = connector.id.toLowerCase()
  const name = connector.name.toLowerCase()
  if (id.includes("phantom") || name.includes("phantom")) return true
  return false
}

export function filterCtfConnectors<T extends Pick<Connector, "id" | "name">>(
  connectors: readonly T[],
): T[] {
  return connectors.filter((c) => !isExcludedInjectedWallet(c))
}
