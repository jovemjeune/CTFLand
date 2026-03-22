import type { Metadata } from "next"

import { TreasuryPageClient } from "@/components/treasury-page-client"

export const metadata: Metadata = {
  title: "Treasury",
  description:
    "Protocol treasury vaults per chain — balances and owner withdrawals; Uniswap Treasury.sol reference.",
}

export default function TreasuryPage() {
  return <TreasuryPageClient />
}
