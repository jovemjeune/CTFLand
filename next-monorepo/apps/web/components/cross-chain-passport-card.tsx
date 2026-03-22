"use client"

import * as React from "react"
import Link from "next/link"
import { useReadContract } from "wagmi"

import { Button } from "@workspace/ui/components/button"

import { getAppChain, getPeerProtocolChain } from "@/lib/chain"
import { getRegistryMirrorAddressOnPeerChain } from "@/lib/deployed-addresses"
import { registryMirrorAbi } from "@/lib/registry-mirror-abi"

/**
 * CCRP — Cross-Chain Registry Passport: highlights Chainlink CCIP + optional peer-chain `RegistryMirror` reads.
 * Hackathon story: canonical Registry on one testnet, mirrored visibility on the other without bridging stake.
 */
export function CrossChainPassportCard() {
  const primary = getAppChain()
  const peer = getPeerProtocolChain()
  const mirrorAddr = getRegistryMirrorAddressOnPeerChain()
  const [ctfId, setCtfId] = React.useState("1")

  const id = React.useMemo(() => {
    const n = BigInt(ctfId.trim() || "0")
    return n > 0n ? n : 1n
  }, [ctfId])

  const { data: creationTime, isLoading: loadingTime } = useReadContract({
    address: mirrorAddr,
    abi: registryMirrorAbi,
    functionName: "ctfCreationTime",
    args: [id],
    chainId: peer.id,
    query: { enabled: !!mirrorAddr },
  })

  const { data: resolved, isLoading: loadingResolved } = useReadContract({
    address: mirrorAddr,
    abi: registryMirrorAbi,
    functionName: "ctfResolved",
    args: [id],
    chainId: peer.id,
    query: { enabled: !!mirrorAddr },
  })

  return (
    <section
      id="ccrp"
      className="border-primary/25 from-primary/5 bg-gradient-to-br to-card/40 scroll-mt-24 space-y-5 rounded-lg border p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-primary font-mono text-sm tracking-wide uppercase">
            CCRP — Cross-chain registry passport
          </h2>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
            <strong className="text-foreground">CCRP</strong> is CTFLand&apos;s{" "}
            <strong className="text-foreground">Chainlink CCIP</strong> layer: the canonical{" "}
            <code className="font-mono text-xs">Registry</code> stays on your primary chain; a{" "}
            <code className="font-mono text-xs">CCIPRegistryPassport</code> sender on the canonical side
            calls <code className="font-mono text-xs">ccipSend</code> so a{" "}
            <code className="font-mono text-xs">RegistryMirror</code> on the peer testnet receives CTF
            lifecycle and outcome state. Native stake and payouts remain per-chain — only{" "}
            <strong className="text-foreground">shared visibility and impact</strong> cross the wire.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
          <Link
            href="/mirror"
            className="text-primary font-mono text-xs underline-offset-4 hover:underline"
          >
            Mirror ops →
          </Link>
          <a
            href="https://docs.chain.link/ccip"
            target="_blank"
            rel="noreferrer"
            className="text-primary font-mono text-xs underline-offset-4 hover:underline"
          >
            CCIP docs →
          </a>
        </div>
      </div>

      <div className="border-border/80 bg-card/40 grid gap-3 rounded-md border p-4 font-mono text-xs sm:grid-cols-2">
        <div>
          <div className="text-muted-foreground uppercase tracking-wide">Primary (app)</div>
          <div className="text-foreground mt-1">
            {primary.name} · {primary.id}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground uppercase tracking-wide">Peer (mirror target)</div>
          <div className="text-foreground mt-1">
            {peer.name} · {peer.id}
          </div>
        </div>
      </div>

      <div className="text-muted-foreground space-y-2 text-xs leading-relaxed">
        <p>
          Contracts: <code className="text-foreground">foundry/src/crosschain/CCIPRegistryPassport.sol</code>{" "}
          (sender), <code className="text-foreground">CCIPRegistryMirrorReceiver.sol</code> +{" "}
          <code className="text-foreground">RegistryMirror.sol</code> (receiver side). See{" "}
          <code className="text-foreground">foundry/CCIP_DEPLOYMENT.md</code> and{" "}
          <code className="text-foreground">foundry/CROSS_CHAIN.md</code>.
        </p>
      </div>

      {!mirrorAddr ? (
        <p className="text-muted-foreground text-sm">
          Deploy a <code className="font-mono text-xs">RegistryMirror</code> on{" "}
          <span className="text-foreground">{peer.name}</span> and set{" "}
          <code className="font-mono text-xs">NEXT_PUBLIC_REGISTRY_MIRROR_ADDRESS</code> or add{" "}
          <code className="font-mono text-xs">RegistryMirror</code> for chain{" "}
          <span className="text-foreground">{peer.id}</span> in{" "}
          <code className="font-mono text-xs">contract-addresses.json</code> to live-read mirror state here.
        </p>
      ) : (
        <div className="border-border/80 bg-card/30 space-y-3 rounded-md border p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-muted-foreground font-mono text-[10px] uppercase tracking-wide">
                Mirror CTF ID
              </span>
              <input
                className="border-border bg-background/60 text-foreground w-28 rounded border px-2 py-1.5 font-mono text-sm"
                value={ctfId}
                onChange={(e) => setCtfId(e.target.value)}
                inputMode="numeric"
              />
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="font-mono text-xs"
              onClick={() => setCtfId(String(Number(ctfId) + 1 || 1))}
            >
              +1
            </Button>
          </div>
          <dl className="text-muted-foreground grid gap-2 font-mono text-xs sm:grid-cols-2">
            <div>
              <dt className="text-foreground/80">ctfCreationTime</dt>
              <dd className="text-foreground mt-1">
                {loadingTime ? (
                  "…"
                ) : creationTime === undefined ? (
                  "—"
                ) : creationTime === 0n ? (
                  <span className="text-muted-foreground">0 (not mirrored)</span>
                ) : (
                  creationTime.toString()
                )}
              </dd>
            </div>
            <div>
              <dt className="text-foreground/80">ctfResolved</dt>
              <dd className="text-foreground mt-1">
                {loadingResolved ? "…" : resolved === undefined ? "—" : resolved ? "true" : "false"}
              </dd>
            </div>
          </dl>
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            Read-only view of <code className="font-mono">RegistryMirror</code> on the peer chain (
            <ShortAddr value={mirrorAddr} />
            ). <code className="font-mono">0</code> creation time means this CTF was not mirrored yet.
          </p>
        </div>
      )}
    </section>
  )
}

function ShortAddr({ value }: { value: string }) {
  return (
    <code className="text-primary bg-muted/40 break-all rounded px-1 font-mono text-[10px]">
      {value.slice(0, 10)}…{value.slice(-6)}
    </code>
  )
}
