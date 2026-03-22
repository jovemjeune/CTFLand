"use client"

import * as React from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import {
  useChainId,
  useConnection,
  useReadContract,
  useSwitchChain,
  useWriteContract,
} from "wagmi"
import { formatEther, isAddressEqual, zeroAddress, type Address, type Hex } from "viem"

import { Button } from "@workspace/ui/components/button"

import { CcipEngineeringChecklist } from "@/components/ccip-engineering-checklist"
import { ccipRegistryPassportAbi } from "@/lib/ccip-registry-passport-abi"
import { ccipPeerChainSelector } from "@/lib/ccip-selectors"
import { getAppChain, getPeerProtocolChain } from "@/lib/chain"
import { getCcipRegistryPassportAddress } from "@/lib/deployed-addresses"
import {
  encodeDefaultOutcomeInner,
  encodeMirrorCtfCreated,
  encodeMirrorMarkFinished,
  encodeMirrorResolved,
} from "@/lib/mirror-payload-codec"
const inputClass =
  "border-border bg-background/50 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary w-full rounded-md border px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2"

export function MirrorOpsClient() {
  const appChain = getAppChain()
  const peer = getPeerProtocolChain()
  const passport = getCcipRegistryPassportAddress()
  const { address, isConnected } = useConnection()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const { writeContractAsync, isPending: isWriting } = useWriteContract()

  const wrongChain = isConnected && chainId !== appChain.id

  const { data: owner } = useReadContract({
    address: passport,
    abi: ccipRegistryPassportAbi,
    functionName: "owner",
    query: { enabled: !!passport && !wrongChain },
  })

  const { data: destSelector } = useReadContract({
    address: passport,
    abi: ccipRegistryPassportAbi,
    functionName: "destinationChainSelector",
    query: { enabled: !!passport && !wrongChain },
  })

  const { data: destReceiver } = useReadContract({
    address: passport,
    abi: ccipRegistryPassportAbi,
    functionName: "destinationReceiver",
    query: { enabled: !!passport && !wrongChain },
  })

  const isOwner =
    !!address &&
    !!owner &&
    isAddressEqual(owner as Address, address as Address)

  const [ctfId, setCtfId] = React.useState("1")
  const [creationTime, setCreationTime] = React.useState("")
  const [supportsTriage, setSupportsTriage] = React.useState(true)
  const [sponsor, setSponsor] = React.useState("")
  const [resolvedKind, setResolvedKind] = React.useState("1")
  const [outcomeHex, setOutcomeHex] = React.useState("")
  const [cfgSelector, setCfgSelector] = React.useState(() =>
    String(ccipPeerChainSelector(appChain.id)),
  )
  const [cfgReceiver, setCfgReceiver] = React.useState("")
  const [lastHash, setLastHash] = React.useState<string | null>(null)
  const [err, setErr] = React.useState<string | null>(null)

  const ctfIdBn = React.useMemo(() => {
    try {
      return BigInt(ctfId || "0")
    } catch {
      return 0n
    }
  }, [ctfId])

  const sponsorAddr = (sponsor || zeroAddress) as Address

  const dataCreated = React.useMemo(() => {
    if (!creationTime) return undefined
    try {
      const t = BigInt(creationTime)
      return encodeMirrorCtfCreated(ctfIdBn, t, supportsTriage, sponsorAddr)
    } catch {
      return undefined
    }
  }, [ctfIdBn, creationTime, supportsTriage, sponsorAddr])

  const dataFinished = React.useMemo(
    () => encodeMirrorMarkFinished(ctfIdBn),
    [ctfIdBn],
  )

  const dataResolved = React.useMemo(() => {
    try {
      const kind = Number(resolvedKind)
      const inner = (outcomeHex?.trim() || encodeDefaultOutcomeInner()) as Hex
      return encodeMirrorResolved(ctfIdBn, kind, inner)
    } catch {
      return undefined
    }
  }, [ctfIdBn, resolvedKind, outcomeHex])

  const { data: feeCreated } = useReadContract({
    address: passport,
    abi: ccipRegistryPassportAbi,
    functionName: "quoteSendFee",
    args: dataCreated ? [dataCreated] : undefined,
    query: { enabled: !!passport && !!dataCreated && !wrongChain },
  })

  const { data: feeFinished } = useReadContract({
    address: passport,
    abi: ccipRegistryPassportAbi,
    functionName: "quoteSendFee",
    args: [dataFinished],
    query: { enabled: !!passport && !wrongChain },
  })

  const { data: feeResolved } = useReadContract({
    address: passport,
    abi: ccipRegistryPassportAbi,
    functionName: "quoteSendFee",
    args: dataResolved ? [dataResolved] : undefined,
    query: { enabled: !!passport && !!dataResolved && !wrongChain },
  })

  async function sendCreatedTx(value: bigint) {
    if (!passport || !isOwner || !creationTime) return
    setErr(null)
    setLastHash(null)
    try {
      const hash = await writeContractAsync({
        address: passport,
        abi: ccipRegistryPassportAbi,
        functionName: "sendCtfCreated",
        args: [ctfIdBn, BigInt(creationTime), supportsTriage, sponsorAddr],
        value,
        chainId: appChain.id,
      })
      setLastHash(hash)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Transaction failed.")
    }
  }

  async function sendFinishedTx(value: bigint) {
    if (!passport || !isOwner) return
    setErr(null)
    setLastHash(null)
    try {
      const hash = await writeContractAsync({
        address: passport,
        abi: ccipRegistryPassportAbi,
        functionName: "sendMarkFinished",
        args: [ctfIdBn],
        value,
        chainId: appChain.id,
      })
      setLastHash(hash)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Transaction failed.")
    }
  }

  async function sendResolvedTx(value: bigint) {
    if (!passport || !isOwner) return
    setErr(null)
    setLastHash(null)
    try {
      const inner = (outcomeHex?.trim() || encodeDefaultOutcomeInner()) as Hex
      const hash = await writeContractAsync({
        address: passport,
        abi: ccipRegistryPassportAbi,
        functionName: "sendResolved",
        args: [ctfIdBn, Number(resolvedKind), inner],
        value,
        chainId: appChain.id,
      })
      setLastHash(hash)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Transaction failed.")
    }
  }

  if (!passport) {
    return (
      <div className="flex max-w-3xl flex-col gap-8">
        <CcipEngineeringChecklist />
        <div className="border-border/80 bg-card/30 max-w-2xl space-y-4 rounded-lg border p-6">
          <p className="text-muted-foreground text-sm leading-relaxed">
            Deploy <code className="font-mono text-xs">CCIPRegistryPassport</code> on your canonical chain (see{" "}
            <code className="font-mono text-xs">foundry/CCIP_DEPLOYMENT.md</code>,{" "}
            <code className="font-mono text-xs">foundry/CROSS_CHAIN.md</code>), then set{" "}
            <code className="font-mono text-xs">CCIPRegistryPassport</code> in{" "}
            <code className="font-mono text-xs">contract-addresses.json</code> for chain{" "}
            <span className="text-foreground">{appChain.id}</span> or{" "}
            <code className="font-mono text-xs">NEXT_PUBLIC_CCIP_REGISTRY_PASSPORT_ADDRESS</code>.
          </p>
          <Button asChild variant="outline" size="sm" className="font-mono text-xs">
            <Link href="/protocol#ccrp">← CCRP on Protocol</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <CcipEngineeringChecklist />
      <div className="border-border/80 bg-card/30 space-y-3 rounded-lg border p-5">
        <p className="text-muted-foreground text-sm leading-relaxed">
          Sends mirror updates over <strong className="text-foreground">Chainlink CCIP</strong> from{" "}
          <strong className="text-foreground">{appChain.name}</strong> to the peer (
          <strong className="text-foreground">{peer.name}</strong>). Uses your wallet RPC (wagmi transport).
          Only the passport <strong className="text-foreground">owner</strong> can call{" "}
          <code className="font-mono text-xs">send*</code> / <code className="font-mono text-xs">setDestination</code>.
        </p>
        <dl className="text-muted-foreground grid gap-2 font-mono text-xs">
          <div>
            <dt className="text-foreground/80">Passport</dt>
            <dd className="break-all">{passport}</dd>
          </div>
          <div>
            <dt className="text-foreground/80">Destination selector / receiver (on-chain)</dt>
            <dd>
              {destSelector?.toString() ?? "—"} / {destReceiver ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-foreground/80">Suggested peer CCIP selector (copy for config)</dt>
            <dd>{ccipPeerChainSelector(appChain.id).toString()}</dd>
          </div>
        </dl>
      </div>

      {!isConnected ? (
        <p className="text-muted-foreground text-sm">Connect the owner wallet in the header.</p>
      ) : wrongChain ? (
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm">Switch to {appChain.name} to use the passport.</p>
          <Button
            type="button"
            size="sm"
            className="font-mono text-xs"
            disabled={isSwitching}
            onClick={() => switchChain({ chainId: appChain.id })}
          >
            {isSwitching ? "Switching…" : `Switch to ${appChain.name}`}
          </Button>
        </div>
      ) : !isOwner ? (
        <p className="text-destructive text-sm">
          Connected wallet is not the passport owner. Use the deployer / owner account.
        </p>
      ) : null}

      {isConnected && !wrongChain && isOwner ? (
        <>
          <section className="border-border/80 bg-card/30 space-y-4 rounded-lg border p-6">
            <h2 className="text-primary font-mono text-sm tracking-wide uppercase">
              Mirror: CTF created
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-muted-foreground font-mono text-[10px] uppercase">ctfId</span>
                <input className={inputClass} value={ctfId} onChange={(e) => setCtfId(e.target.value)} />
              </label>
              <label className="space-y-1">
                <span className="text-muted-foreground font-mono text-[10px] uppercase">
                  creationTime (unix sec)
                </span>
                <input
                  className={inputClass}
                  placeholder={String(Math.floor(Date.now() / 1000))}
                  value={creationTime}
                  onChange={(e) => setCreationTime(e.target.value)}
                />
              </label>
              <label className="flex items-center gap-2 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={supportsTriage}
                  onChange={(e) => setSupportsTriage(e.target.checked)}
                />
                <span className="text-muted-foreground text-sm">supportsTriage</span>
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-muted-foreground font-mono text-[10px] uppercase">sponsor</span>
                <input
                  className={inputClass}
                  placeholder="0x…"
                  value={sponsor}
                  onChange={(e) => setSponsor(e.target.value)}
                />
              </label>
            </div>
            <p className="text-muted-foreground font-mono text-xs">
              Fee quote:{" "}
              {feeCreated != null
                ? `${feeCreated.toString()} wei (~${formatEther(feeCreated)} native)`
                : "—"}
            </p>
            <Button
              type="button"
              size="sm"
              className="font-mono text-xs"
              disabled={
                isWriting ||
                feeCreated == null ||
                !creationTime ||
                !dataCreated
              }
              onClick={() => void sendCreatedTx(feeCreated ?? 0n)}
            >
              {isWriting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "sendCtfCreated (pay fee)"
              )}
            </Button>
          </section>

          <section className="border-border/80 bg-card/30 space-y-4 rounded-lg border p-6">
            <h2 className="text-primary font-mono text-sm tracking-wide uppercase">
              Mirror: mark finished
            </h2>
            <label className="space-y-1">
              <span className="text-muted-foreground font-mono text-[10px] uppercase">ctfId</span>
              <input className={inputClass} value={ctfId} onChange={(e) => setCtfId(e.target.value)} />
            </label>
            <p className="text-muted-foreground font-mono text-xs">
              Fee:{" "}
              {feeFinished != null
                ? `${feeFinished.toString()} wei (~${formatEther(feeFinished)})`
                : "—"}
            </p>
            <Button
              type="button"
              size="sm"
              className="font-mono text-xs"
              disabled={isWriting || feeFinished == null}
              onClick={() => void sendFinishedTx(feeFinished ?? 0n)}
            >
              sendMarkFinished
            </Button>
          </section>

          <section className="border-border/80 bg-card/30 space-y-4 rounded-lg border p-6">
            <h2 className="text-primary font-mono text-sm tracking-wide uppercase">
              Mirror: resolved
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-muted-foreground font-mono text-[10px] uppercase">ctfId</span>
                <input className={inputClass} value={ctfId} onChange={(e) => setCtfId(e.target.value)} />
              </label>
              <label className="space-y-1">
                <span className="text-muted-foreground font-mono text-[10px] uppercase">kind (uint8)</span>
                <input
                  className={inputClass}
                  value={resolvedKind}
                  onChange={(e) => setResolvedKind(e.target.value)}
                />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-muted-foreground font-mono text-[10px] uppercase">
                  outcome inner payload (hex), or empty for default empty tuple
                </span>
                <textarea
                  className={`${inputClass} min-h-[72px]`}
                  placeholder="0x (optional)"
                  value={outcomeHex}
                  onChange={(e) => setOutcomeHex(e.target.value)}
                />
              </label>
            </div>
            <p className="text-muted-foreground font-mono text-xs">
              Fee:{" "}
              {feeResolved != null
                ? `${feeResolved.toString()} wei (~${formatEther(feeResolved)})`
                : "—"}
            </p>
            <Button
              type="button"
              size="sm"
              className="font-mono text-xs"
              disabled={isWriting || feeResolved == null || !dataResolved}
              onClick={() => void sendResolvedTx(feeResolved ?? 0n)}
            >
              sendResolved
            </Button>
          </section>

          <section className="border-border/80 bg-card/30 space-y-4 rounded-lg border p-6">
            <h2 className="text-primary font-mono text-sm tracking-wide uppercase">
              Config (owner): setDestination
            </h2>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Set the peer chain <strong className="text-foreground">CCIP chain selector</strong> and the{" "}
              <strong className="text-foreground">CCIPRegistryMirrorReceiver</strong> contract on the destination (the
              CCIP router delivers messages to this receiver; it then updates <code className="font-mono">RegistryMirror</code>
              ). Do not use the raw <code className="font-mono">RegistryMirror</code> address as the receiver unless your
              deployment wires it that way.
            </p>
            <label className="space-y-1">
              <span className="text-muted-foreground font-mono text-[10px] uppercase">
                destinationChainSelector (uint64)
              </span>
              <input className={inputClass} value={cfgSelector} onChange={(e) => setCfgSelector(e.target.value)} />
            </label>
            <label className="space-y-1">
              <span className="text-muted-foreground font-mono text-[10px] uppercase">
                destinationReceiver (peer)
              </span>
              <input className={inputClass} value={cfgReceiver} onChange={(e) => setCfgReceiver(e.target.value)} />
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="font-mono text-xs"
              disabled={isWriting || !cfgReceiver.startsWith("0x")}
              onClick={async () => {
                setErr(null)
                try {
                  const hash = await writeContractAsync({
                    address: passport,
                    abi: ccipRegistryPassportAbi,
                    functionName: "setDestination",
                    args: [BigInt(cfgSelector), cfgReceiver as Address],
                    chainId: appChain.id,
                  })
                  setLastHash(hash)
                } catch (e) {
                  setErr(e instanceof Error ? e.message : "Failed.")
                }
              }}
            >
              setDestination
            </Button>
          </section>
        </>
      ) : null}

      {err ? <p className="text-destructive text-sm">{err}</p> : null}
      {lastHash ? (
        <p className="text-muted-foreground font-mono text-xs">
          Last tx: <span className="text-foreground break-all">{lastHash}</span>
        </p>
      ) : null}
    </div>
  )
}
