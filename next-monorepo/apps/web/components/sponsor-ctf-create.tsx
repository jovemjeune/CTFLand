"use client"

import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertCircle, BadgeCheck, Loader2, RefreshCw } from "lucide-react"
import {
  useChainId,
  useConnection,
  usePublicClient,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi"
import { decodeEventLog, formatEther, parseEther, type Address } from "viem"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { getAppChain } from "@/lib/chain"
import {
  getRegistryAddressForApp,
  getSponsorNftAddressForApp,
} from "@/lib/deployed-addresses"
import { suggestNextCtfId } from "@/lib/next-ctf-id"
import { registryAbi } from "@/lib/registry-abi"
import { sponsorNftAbi } from "@/lib/sponsor-nft-abi"

/** Local-only sponsor intent (not on-chain). Survives refresh within the tab. */
const SPONSOR_BRIEF_STORAGE_KEY = "ctfland_sponsor_ctf_brief"

const CTF_TYPE_OPTIONS = [
  { value: "audit", label: "CTF — Security audit" },
  { value: "bounty", label: "CTF — Security bounty" },
  { value: "general", label: "CTF — General" },
  { value: "job", label: "CTF — Job" },
  { value: "hackathon", label: "CTF — Hackathon" },
] as const

const PITCH_MIN_LEN = 10

/**
 * On-chain CTF creation via {@link SponsorNFT.becomeSponsorWithNativeToken}:
 * creates the CTF on Registry, deposits stake, mints the Sponsor NFT to the caller.
 *
 * CTF ID is chosen automatically: from `CtfCreated` logs (chunked RPC-safe) when deploy block is set,
 * otherwise a unique time-based ID verified on-chain.
 */
export function SponsorCtfCreate() {
  const chain = getAppChain()
  const registryAddr = getRegistryAddressForApp()
  const sponsorAddr = getSponsorNftAddressForApp()
  const queryClient = useQueryClient()

  const { address, isConnected } = useConnection()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const publicClient = usePublicClient()

  const wrongChain = isConnected && chainId !== chain.id

  const [baseEth, setBaseEth] = React.useState("")
  const [ctfType, setCtfType] = React.useState<string>("")
  const [pitch, setPitch] = React.useState("")
  const [supportsTriage, setSupportsTriage] = React.useState(false)
  const [onboarded, setOnboarded] = React.useState<{
    tokenId: bigint
    ctfId: bigint
    amount: bigint
    collateral: bigint
  } | null>(null)

  const skipFirstBriefPersist = React.useRef(true)

  React.useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const raw = sessionStorage.getItem(SPONSOR_BRIEF_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as { ctfType?: string; pitch?: string }
      if (typeof parsed.ctfType === "string") setCtfType(parsed.ctfType)
      if (typeof parsed.pitch === "string") setPitch(parsed.pitch)
    } catch {
      /* ignore */
    }
  }, [])

  React.useEffect(() => {
    if (typeof window === "undefined") return
    if (skipFirstBriefPersist.current) {
      skipFirstBriefPersist.current = false
      return
    }
    try {
      sessionStorage.setItem(
        SPONSOR_BRIEF_STORAGE_KEY,
        JSON.stringify({
          ctfType,
          pitch,
          savedAt: new Date().toISOString(),
        }),
      )
    } catch {
      /* ignore */
    }
  }, [ctfType, pitch])

  const {
    data: ctfSuggestion,
    isLoading: isSuggesting,
    isFetching: isRefetchingSuggestion,
    error: suggestError,
    refetch: refetchSuggestion,
  } = useQuery({
    queryKey: ["nextCtfId", registryAddr, chainId],
    queryFn: async () => {
      if (!publicClient || !registryAddr) {
        throw new Error("Missing RPC or Registry")
      }
      return suggestNextCtfId(publicClient, registryAddr, chainId)
    },
    enabled:
      !!publicClient && !!registryAddr && !wrongChain && !!isConnected,
  })

  const autoCtfId = ctfSuggestion?.nextId

  const baseWei = React.useMemo(() => {
    const t = baseEth.trim()
    if (!t) return undefined
    try {
      const w = parseEther(t)
      if (w <= 0n) return undefined
      return w
    } catch {
      return undefined
    }
  }, [baseEth])

  const collateralWei =
    baseWei !== undefined ? (baseWei * 10n) / 100n : undefined
  const totalWei =
    baseWei !== undefined && collateralWei !== undefined
      ? baseWei + collateralWei
      : undefined

  const { data: ctfTakenTime } = useReadContract({
    address: registryAddr,
    abi: registryAbi,
    functionName: "ctfCreationTime",
    args: autoCtfId !== undefined ? [autoCtfId] : undefined,
    query: {
      enabled:
        !!registryAddr &&
        autoCtfId !== undefined &&
        !wrongChain &&
        !!isConnected,
    },
  })

  const { data: registrySponsorNft } = useReadContract({
    address: registryAddr,
    abi: registryAbi,
    functionName: "sponsorNFT",
    query: {
      enabled: !!registryAddr && !wrongChain && !!isConnected,
    },
  })

  const ctfIdTaken =
    ctfTakenTime !== undefined && ctfTakenTime !== 0n && autoCtfId !== undefined

  const registryMatchesSponsor =
    !sponsorAddr ||
    !registrySponsorNft ||
    (registrySponsorNft as Address).toLowerCase() ===
      sponsorAddr.toLowerCase()

  const {
    writeContract,
    data: txHash,
    error: writeError,
    isPending: isWriting,
    reset: resetWrite,
  } = useWriteContract()

  React.useEffect(() => {
    setOnboarded(null)
  }, [baseEth, supportsTriage])

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash })

  React.useEffect(() => {
    if (!isConfirmed || !txHash || !publicClient || !sponsorAddr) return
    let cancelled = false
    void (async () => {
      const receipt = await publicClient.getTransactionReceipt({ hash: txHash })
      if (cancelled) return
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== sponsorAddr.toLowerCase()) continue
        try {
          const decoded = decodeEventLog({
            abi: sponsorNftAbi,
            data: log.data,
            topics: log.topics,
            strict: false,
          })
          if (decoded.eventName === "SponsorOnboarded") {
            const args = decoded.args as {
              tokenId: bigint
              ctfId: bigint
              amount: bigint
              collateral: bigint
            }
            setOnboarded({
              tokenId: args.tokenId,
              ctfId: args.ctfId,
              amount: args.amount,
              collateral: args.collateral,
            })
            void queryClient.invalidateQueries({ queryKey: ["nextCtfId"] })
            break
          }
        } catch {
          /* next log */
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isConfirmed, txHash, publicClient, sponsorAddr, queryClient])

  React.useEffect(() => {
    if (txHash) setOnboarded(null)
  }, [txHash])

  const briefComplete =
    ctfType !== "" && pitch.trim().length >= PITCH_MIN_LEN

  const canSubmit =
    !!sponsorAddr &&
    !!registryAddr &&
    !!address &&
    !wrongChain &&
    autoCtfId !== undefined &&
    baseWei !== undefined &&
    totalWei !== undefined &&
    !ctfIdTaken &&
    registryMatchesSponsor &&
    !isSuggesting &&
    !!ctfSuggestion &&
    briefComplete

  const handleCreate = React.useCallback(async () => {
    if (
      !canSubmit ||
      sponsorAddr === undefined ||
      baseWei === undefined ||
      totalWei === undefined
    ) {
      return
    }

    const fresh = await refetchSuggestion()
    const id = fresh.data?.nextId
    if (id === undefined) return

    const t = await publicClient?.readContract({
      address: registryAddr!,
      abi: registryAbi,
      functionName: "ctfCreationTime",
      args: [id],
    })
    if (t !== undefined && t !== 0n) {
      void queryClient.invalidateQueries({ queryKey: ["nextCtfId"] })
      return
    }

    resetWrite()
    writeContract({
      address: sponsorAddr,
      abi: sponsorNftAbi,
      functionName: "becomeSponsorWithNativeToken",
      args: [baseWei, id, supportsTriage],
      value: totalWei,
    })
  }, [
    canSubmit,
    sponsorAddr,
    baseWei,
    totalWei,
    supportsTriage,
    writeContract,
    resetWrite,
    refetchSuggestion,
    publicClient,
    registryAddr,
    queryClient,
  ])

  if (!sponsorAddr || !registryAddr) {
    return (
      <div className="border-border/80 bg-card/30 flex gap-3 rounded-lg border border-dashed p-6">
        <AlertCircle className="text-muted-foreground size-5 shrink-0" />
        <p className="text-muted-foreground text-sm leading-relaxed">
          Set{" "}
          <code className="font-mono text-xs">NEXT_PUBLIC_SPONSOR_NFT_ADDRESS</code>{" "}
          and{" "}
          <code className="font-mono text-xs">NEXT_PUBLIC_REGISTRY_ADDRESS</code>{" "}
          (or deploy entries in{" "}
          <code className="font-mono text-xs">lib/contract-addresses.json</code>
          ) for your primary chain (
          <span className="text-foreground font-mono">{chain.id}</span>).
        </p>
      </div>
    )
  }

  if (!registryMatchesSponsor) {
    return (
      <div className="border-destructive/40 bg-destructive/5 flex gap-3 rounded-lg border p-6">
        <AlertCircle className="text-destructive size-5 shrink-0" />
        <p className="text-destructive text-sm leading-relaxed">
          Registry’s{" "}
          <code className="font-mono text-xs">sponsorNFT</code> does not match
          this app’s Sponsor NFT address — check{" "}
          <code className="font-mono text-xs">NEXT_PUBLIC_CHAIN_ID</code> and
          contract addresses.
        </p>
      </div>
    )
  }

  return (
    <section className="border-border/80 bg-card/30 space-y-6 rounded-lg border p-6">
      <div>
        <h2 className="text-primary font-mono text-sm tracking-wide uppercase">
          Create a CTF (on-chain)
        </h2>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          First, record your <strong className="text-foreground">CTF type</strong> and{" "}
          <strong className="text-foreground">pitch</strong> — stored only in this browser (
          <code className="font-mono text-xs">sessionStorage</code>
          ), not on-chain. Then configure stake and mint as before.
        </p>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Your <strong className="text-foreground">CTF ID</strong> is assigned
          automatically (no manual entry). With{" "}
          <code className="font-mono text-xs">NEXT_PUBLIC_REGISTRY_DEPLOY_BLOCK*</code>{" "}
          set, we scan <code className="font-mono text-xs">CtfCreated</code> in
          small block windows (RPC-safe) and pick max + 1, then confirm it’s
          free. Otherwise we use a unique time-based ID checked on-chain. You
          set a <strong className="text-foreground">base reward</strong> in native
          token; you pay{" "}
          <strong className="text-foreground">base + 10% collateral</strong> in one
          transaction: Registry records the CTF, stakes the amount, and you get a{" "}
          <strong className="text-foreground">Sponsor NFT</strong>.
        </p>
      </div>

      {!isConnected || !address ? (
        <p className="text-muted-foreground text-sm">
          Connect your wallet in the header to continue.
        </p>
      ) : wrongChain ? (
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Switch to your app primary network ({chain.name}) to create a CTF.
          </p>
          <Button
            type="button"
            size="sm"
            className="font-mono text-xs"
            disabled={isSwitching}
            onClick={() => switchChain({ chainId: chain.id })}
          >
            {isSwitching ? "Switching…" : `Switch to ${chain.name}`}
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="border-primary/20 bg-primary/5 space-y-3 rounded-lg border p-4">
            <h3 className="text-primary font-mono text-xs tracking-wide uppercase">
              CTF brief (local only)
            </h3>
            <div className="grid gap-3">
              <label className="grid gap-1.5">
                <span className="text-muted-foreground font-mono text-[10px] uppercase">
                  CTF type
                </span>
                <select
                  value={ctfType}
                  onChange={(e) => setCtfType(e.target.value)}
                  className={cn(
                    "border-border bg-background text-foreground",
                    "focus-visible:ring-primary/40 rounded-md border px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2",
                  )}
                >
                  <option value="">Select mode…</option>
                  {CTF_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5">
                <span className="text-muted-foreground font-mono text-[10px] uppercase">
                  Pitch / idea ({PITCH_MIN_LEN}+ chars)
                </span>
                <textarea
                  value={pitch}
                  onChange={(e) => setPitch(e.target.value)}
                  placeholder="What are competitors solving? Scope, success criteria, anything public you want remembered before you stake."
                  rows={4}
                  className={cn(
                    "border-border bg-background text-foreground placeholder:text-muted-foreground",
                    "focus-visible:ring-primary/40 min-h-[96px] resize-y rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2",
                  )}
                />
                <span className="text-muted-foreground text-[10px]">
                  {pitch.trim().length} / {PITCH_MIN_LEN} min
                </span>
              </label>
            </div>
            {!briefComplete ? (
              <p className="text-muted-foreground text-xs leading-relaxed">
                Choose a type and a short pitch to unlock on-chain creation. This is for your demo /
                ops trail only.
              </p>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground font-mono text-xs"
              onClick={() => {
                setCtfType("")
                setPitch("")
                try {
                  sessionStorage.removeItem(SPONSOR_BRIEF_STORAGE_KEY)
                } catch {
                  /* ignore */
                }
              }}
            >
              Clear brief
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs uppercase tracking-wide">
                CTF ID (automatic)
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="font-mono text-xs"
                disabled={isRefetchingSuggestion || isSuggesting}
                onClick={() => void refetchSuggestion()}
              >
                {isRefetchingSuggestion ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
                <span className="ml-1.5">Refresh</span>
              </Button>
            </div>

            {isSuggesting || isRefetchingSuggestion ? (
              <div className="text-muted-foreground flex items-center gap-2 font-mono text-sm">
                <Loader2 className="size-4 animate-spin" />
                Resolving next CTF ID…
              </div>
            ) : suggestError ? (
              <div className="border-destructive/40 bg-destructive/5 rounded-md border px-3 py-2 text-sm">
                <p className="text-destructive">
                  {suggestError instanceof Error
                    ? suggestError.message
                    : "Could not assign a CTF ID."}
                </p>
                <button
                  type="button"
                  className="text-primary mt-2 font-mono text-xs underline-offset-4 hover:underline"
                  onClick={() => void refetchSuggestion()}
                >
                  Retry
                </button>
              </div>
            ) : ctfSuggestion ? (
              <div className="border-border/80 bg-background/50 space-y-2 rounded-md border px-3 py-3 font-mono text-sm">
                {ctfSuggestion.source === "events" ? (
                  <>
                    <p className="text-muted-foreground text-xs">
                      Latest CTF ID in scanned events:{" "}
                      <span className="text-foreground">
                        {ctfSuggestion.ctfCreatedCount === 0
                          ? "— (none yet)"
                          : ctfSuggestion.maxId.toString()}
                      </span>
                    </p>
                    <p className="text-foreground text-base">
                      Your new CTF ID:{" "}
                      <span className="text-primary font-semibold">
                        {ctfSuggestion.nextId.toString()}
                      </span>
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      Set{" "}
                      <code className="text-foreground font-mono">
                        NEXT_PUBLIC_REGISTRY_DEPLOY_BLOCK
                      </code>
                      ,{" "}
                      <code className="text-foreground font-mono">
                        NEXT_PUBLIC_REGISTRY_DEPLOY_BLOCK_43113
                      </code>
                      , or{" "}
                      <code className="text-foreground font-mono">
                        NEXT_PUBLIC_REGISTRY_DEPLOY_BLOCK_421614
                      </code>{" "}
                      (Registry deployment block from the explorer) so we can scan{" "}
                      <code className="font-mono text-xs">CtfCreated</code> in
                      2048-block chunks. Until then we assign a unique ID verified
                      on-chain.
                    </p>
                    <p className="text-foreground text-base">
                      Your CTF ID:{" "}
                      <span className="text-primary font-semibold">
                        {ctfSuggestion.nextId.toString()}
                      </span>
                    </p>
                  </>
                )}
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  We re-check the ID right before you submit. If another transaction
                  claims it first, refresh and try again.
                </p>
              </div>
            ) : null}
          </div>

          <div className="grid gap-2">
            <label htmlFor="base-eth" className="font-mono text-xs">
              Base reward (native token, excl. 10% collateral)
            </label>
            <input
              id="base-eth"
              inputMode="decimal"
              placeholder="0.01"
              value={baseEth}
              onChange={(e) => setBaseEth(e.target.value)}
              className={cn(
                "border-border bg-background text-foreground placeholder:text-muted-foreground",
                "focus-visible:ring-primary/40 rounded-md border px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2",
              )}
            />
            {baseWei === undefined && baseEth.trim() !== "" ? (
              <p className="text-destructive text-xs">
                Enter a valid positive amount (e.g. 0.05).
              </p>
            ) : null}
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={supportsTriage}
              onChange={(e) => setSupportsTriage(e.target.checked)}
              className="accent-primary"
            />
            <span className="text-muted-foreground">
              CTF supports triage (affects payout split on resolve)
            </span>
          </label>

          {baseWei !== undefined &&
          collateralWei !== undefined &&
          totalWei !== undefined ? (
            <div className="text-muted-foreground border-border/80 rounded-md border border-dashed px-3 py-2 font-mono text-[11px] leading-relaxed">
              <div>
                Base:{" "}
                <span className="text-foreground">{formatEther(baseWei)}</span>
              </div>
              <div>
                Collateral (10%):{" "}
                <span className="text-foreground">
                  {formatEther(collateralWei)}
                </span>
              </div>
              <div className="text-primary mt-1">
                Total send: {formatEther(totalWei)} (native)
              </div>
            </div>
          ) : null}

          <Button
            type="button"
            size="sm"
            className="font-mono text-xs"
            disabled={!canSubmit || isWriting || isConfirming}
            onClick={() => void handleCreate()}
          >
            {isWriting || isConfirming ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="text-primary size-4 animate-spin" />
                {isWriting ? "Confirm in wallet…" : "Confirming…"}
              </span>
            ) : (
              "Create CTF & mint Sponsor NFT"
            )}
          </Button>

          {writeError ? (
            <p className="text-destructive max-w-prose text-xs leading-relaxed">
              {writeError.message}
            </p>
          ) : null}

          {isConfirmed && onboarded ? (
            <div className="border-border/80 bg-background/50 flex gap-3 rounded-md border px-3 py-3">
              <BadgeCheck className="text-primary size-5 shrink-0" />
              <div className="space-y-2 text-sm">
                <p className="text-foreground font-medium">
                  CTF created & Sponsor NFT minted
                </p>
                {ctfType ? (
                  <div className="border-border/60 bg-card/40 rounded border border-dashed px-2 py-2 text-xs">
                    <p className="text-primary font-mono text-[10px] uppercase">
                      Saved brief (local)
                    </p>
                    <p className="text-foreground mt-1 font-medium">
                      {CTF_TYPE_OPTIONS.find((o) => o.value === ctfType)?.label ??
                        ctfType}
                    </p>
                    {pitch.trim() ? (
                      <p className="text-muted-foreground mt-1 whitespace-pre-wrap leading-relaxed">
                        {pitch.trim()}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <p className="text-muted-foreground font-mono text-xs leading-relaxed">
                  Your CTF ID:{" "}
                  <span className="text-foreground">
                    {onboarded.ctfId.toString()}
                  </span>
                  {" · "}
                  Sponsor NFT #
                  <span className="text-foreground">
                    {onboarded.tokenId.toString()}
                  </span>
                </p>
                <p className="text-muted-foreground font-mono text-[11px]">
                  Tx:{" "}
                  <span className="text-foreground break-all">{txHash}</span>
                </p>
              </div>
            </div>
          ) : null}

          {isConfirmed && !onboarded && !writeError ? (
            <p className="text-muted-foreground text-xs">
              Transaction confirmed — parsing logs… refresh if details don’t
              appear.
            </p>
          ) : null}
        </div>
      )}
    </section>
  )
}
