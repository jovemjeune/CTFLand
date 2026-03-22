"use client"

import * as React from "react"
import Link from "next/link"
import { AlertCircle, BadgeCheck, Loader2 } from "lucide-react"
import { useChainId, useConnection, useReadContract } from "wagmi"

import { Button } from "@workspace/ui/components/button"

import { CompetitorWorldIdMint } from "@/components/competitor-world-id-mint"
import { competitorNftAbi } from "@/lib/competitor-abi"
import { getAppChain } from "@/lib/chain"
import { getCompetitorNftAddressForApp } from "@/lib/deployed-addresses"

/**
 * Step 3 on /competitors: checks `CompetitorNFT` balance; if missing, runs World ID + mint
 * via {@link CompetitorWorldIdMint}.
 */
export function ContributorIdentityCheck() {
  const nft = getCompetitorNftAddressForApp()
  const chain = getAppChain()
  const { address, isConnected } = useConnection()
  const chainId = useChainId()
  const wrongChain = isConnected && chainId !== chain.id

  const { data: balance, isLoading: balanceLoading } = useReadContract({
    address: nft,
    abi: competitorNftAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!nft },
  })

  const hasNft = balance !== undefined && balance > 0n

  if (!nft) {
    return (
      <div className="border-border/80 bg-card/30 flex gap-3 rounded-lg border border-dashed p-6">
        <AlertCircle className="text-muted-foreground size-5 shrink-0" />
        <p className="text-muted-foreground text-sm leading-relaxed">
          Deploy <code className="font-mono text-xs">CompetitorNFT</code> and set{" "}
          <code className="font-mono text-xs">NEXT_PUBLIC_COMPETITOR_NFT_ADDRESS</code>{" "}
          or add it under your chain in{" "}
          <code className="font-mono text-xs">lib/contract-addresses.json</code>{" "}
          (from <code className="font-mono text-xs">contract_addresses.json</code> at the repo root).
        </p>
      </div>
    )
  }

  return (
    <section className="border-border/80 bg-card/30 space-y-4 rounded-lg border p-6">
      <h2 className="text-primary font-mono text-sm tracking-wide uppercase">
        3 · Access your competitor profile
      </h2>
      <p className="text-muted-foreground text-sm leading-relaxed">
        Use the check below: if you already hold a Competitor NFT, open your full profile;
        if not, complete World ID verification to mint (same flow as{" "}
        <Link className="text-primary underline-offset-4 hover:underline" href="/profile">
          /profile
        </Link>
        ).
      </p>

      {!isConnected || !address ? (
        <p className="text-muted-foreground text-sm">
          Use <strong className="text-foreground">Connect</strong> in the header, then
          continue here.
        </p>
      ) : wrongChain ? (
        <p className="text-muted-foreground text-sm">
          Switch to <strong className="text-foreground">{chain.name}</strong> (chain{" "}
          {chain.id}) in the header or your wallet.
        </p>
      ) : balanceLoading ? (
        <Loader2 className="text-primary size-6 animate-spin" aria-label="Loading" />
      ) : hasNft ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-md border border-primary/30 bg-primary/5 px-4 py-3">
            <BadgeCheck className="text-primary mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-mono text-sm text-foreground">
                Competitor NFT detected for this wallet
              </p>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                Credential active — open the profile for balance, token id, and nullifier.
              </p>
            </div>
          </div>
          <Button asChild className="font-mono text-xs tracking-wide" size="sm">
            <Link href="/profile">Open competitor profile</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">
            No Competitor NFT on this address yet — verify with World ID and mint (soulbound
            to this wallet).
          </p>
          <CompetitorWorldIdMint />
        </div>
      )}
    </section>
  )
}

/** @deprecated Use {@link ContributorIdentityCheck} */
export const CompetitorIdentityGate = ContributorIdentityCheck
