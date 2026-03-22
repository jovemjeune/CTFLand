/** Basis points with denominator 10_000 → human percent label. */
export function bpsToPercentLabel(bps: bigint): string {
  const n = Number(bps) / 100
  return `${n % 1 === 0 ? String(n) : n.toFixed(2)}%`
}
