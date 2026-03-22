"use client"

import * as React from "react"
import {
  AlertCircle,
  Loader2,
  Shield,
  Wallet,
} from "lucide-react"
import {
  useChainId,
  useConnection,
  usePublicClient,
  useReadContract,
  useSwitchChain,
} from "wagmi"

import { Button } from "@workspace/ui/components/button"

import { CompetitorWorldIdMint } from "@/components/competitor-world-id-mint"
import { competitorNftAbi } from "@/lib/competitor-abi"
import { fetchCompetitorTokenId } from "@/lib/competitor-read"
import { getAppChain } from "@/lib/chain"
import { getCompetitorNftAddressForApp } from "@/lib/deployed-addresses"

export function CompetitorProfileClient() {
  const nft = getCompetitorNftAddressForApp()
  const chain = getAppChain()

  const { address, isConnected } = useConnection()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const publicClient = usePublicClient()

  const wrongChain = isConnected && chainId !== chain.id

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: nft,
    abi: competitorNftAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!nft },
  })

  const [tokenId, setTokenId] = React.useState<bigint | null>(null)
  const [tokenLoading, setTokenLoading] = React.useState(false)

  React.useEffect(() => {
    if (!publicClient || !nft || !address) {
      setTokenId(null)
      return
    }
    let cancelled = false
    setTokenLoading(true)
    void fetchCompetitorTokenId(publicClient, nft, address)
      .then((id) => {
        if (!cancelled) setTokenId(id)
      })
      .catch(() => {
        if (!cancelled) setTokenId(null)
      })
      .finally(() => {
        if (!cancelled) setTokenLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [publicClient, nft, address, balance])

  const { data: tokenNullifier } = useReadContract({
    address: nft,
    abi: competitorNftAbi,
    functionName: "tokenNullifier",
    args: tokenId != null ? [tokenId] : undefined,
    query: {
      enabled: !!nft && tokenId != null && tokenId > 0n,
    },
  })

  return (
    <div className="flex flex-col gap-10">
      <header>
        <h1 className="font-mono text-2xl tracking-tight sm:text-3xl">
          Competitor profile
        </h1>
        <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-relaxed">
          World ID proof of personhood, then mint your Competitor NFT on-chain
          (same flow as{" "}
          <code className="text-primary font-mono text-xs">CompetitorNFT</code>{" "}
          in Foundry). Signal must be your connected wallet address. The NFT is
          soulbound (non-transferable).
        </p>
      </header>

      <section className="border-border/80 bg-card/30 grid gap-6 rounded-lg border p-6 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-primary font-mono text-xs tracking-wide uppercase">
            Wallet
          </p>
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Wallet className="size-4 shrink-0 opacity-70" />
            {isConnected && address ? (
              <span className="font-mono text-xs break-all">{address}</span>
            ) : (
              <span>Not connected — use Connect in the header.</span>
            )}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-primary font-mono text-xs tracking-wide uppercase">
            Network
          </p>
          <p className="text-muted-foreground text-sm">
            {chain.name} (chainId {chain.id})
          </p>
          {wrongChain ? (
            <Button
              type="button"
              size="sm"
              className="mt-2 font-mono text-xs"
              disabled={isSwitching}
              onClick={() => switchChain({ chainId: chain.id })}
            >
              {isSwitching ? "Switching…" : "Switch network"}
            </Button>
          ) : null}
        </div>
      </section>

      {!nft ? (
        <div className="border-border/80 bg-card/30 flex gap-3 rounded-lg border border-dashed p-8">
          <AlertCircle className="text-muted-foreground size-5 shrink-0" />
          <div>
            <p className="font-mono text-sm">Competitor NFT not configured</p>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Set{" "}
              <code className="font-mono text-xs">
                NEXT_PUBLIC_COMPETITOR_NFT_ADDRESS
              </code>{" "}
              in <code className="font-mono text-xs">apps/web/.env.local</code> or
              add <code className="font-mono text-xs">CompetitorNFT</code> for
              your chain in{" "}
              <code className="font-mono text-xs">lib/contract-addresses.json</code>.
            </p>
          </div>
        </div>
      ) : null}

      <section className="border-border/80 bg-card/30 space-y-4 rounded-lg border p-6">
        <div className="flex items-start gap-3">
          <Shield className="text-primary mt-0.5 size-5 shrink-0" />
          <div>
            <h2 className="font-mono text-base tracking-tight">
              World ID → Competitor NFT
            </h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Use Orb verification. The proof must use this wallet as the
              signal (IDKit passes your address). The contract must use the
              same World app action / external nullifier as configured at
              deploy time.
            </p>
          </div>
        </div>

        <CompetitorWorldIdMint
          onMintConfirmed={refetchBalance}
        />
      </section>

      <section className="border-border/80 bg-card/30 space-y-4 rounded-lg border p-6">
        <h2 className="text-primary font-mono text-sm tracking-wide uppercase">
          On-chain credential
        </h2>
        {!isConnected || !address ? (
          <p className="text-muted-foreground text-sm">
            Connect a wallet to load your Competitor NFT.
          </p>
        ) : !nft ? null : (
          <dl className="text-muted-foreground space-y-3 font-mono text-xs sm:text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <dt>Balance</dt>
              <dd className="text-foreground">
                {balance === undefined ? (
                  <Loader2 className="inline size-4 animate-spin" />
                ) : (
                  balance.toString()
                )}
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt>Token ID</dt>
              <dd className="text-foreground">
                {tokenLoading ? (
                  <Loader2 className="inline size-4 animate-spin" />
                ) : tokenId != null ? (
                  tokenId.toString()
                ) : (
                  "—"
                )}
              </dd>
            </div>
            {tokenNullifier !== undefined && tokenId != null && tokenId > 0n ? (
              <div className="flex flex-col gap-1">
                <dt>Nullifier hash (indexing)</dt>
                <dd className="text-foreground max-w-full break-all">
                  {tokenNullifier.toString()}
                </dd>
              </div>
            ) : null}
          </dl>
        )}
      </section>
    </div>
  )
}
