"use client"

import * as React from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import {
  useBalance,
  useChainId,
  useConnection,
  useReadContract,
  useSwitchChain,
  useWriteContract,
} from "wagmi"
import { formatEther, isAddressEqual, parseEther, zeroAddress, type Address } from "viem"

import { Button } from "@workspace/ui/components/button"

import { CTF_PROTOCOL_CHAINS } from "@/lib/chain"
import { getProtocolTreasuryAddressForChain } from "@/lib/deployed-addresses"
import { protocolTreasuryVaultAbi } from "@/lib/protocol-treasury-vault-abi"

const inputClass =
  "border-border bg-background/50 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary w-full rounded-md border px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2"

export function TreasuryPageClient() {
  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <header>
        <h1 className="font-mono text-2xl tracking-tight sm:text-3xl">Treasury</h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          On testnets, protocol fees accrue to the deployed{" "}
          <code className="font-mono text-xs">ProtocolTreasuryVault</code> per chain (see{" "}
          <Link className="text-primary underline-offset-4 hover:underline" href="/protocol">
            Protocol
          </Link>
          ). The vault owner can forward native balance to any address.
        </p>
      </header>

      <section className="border-border/80 bg-card/30 space-y-4 rounded-lg border p-6">
        <h2 className="text-primary font-mono text-sm tracking-wide uppercase">
          ProtocolTreasuryVault (deployed)
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          <strong className="text-foreground">receive()</strong> — accept native ETH/AVAX (e.g. from{" "}
          <code className="font-mono text-xs">Registry.distributeRewards</code>).{" "}
          <strong className="text-foreground">withdraw(to, amount)</strong> — owner-only, pull native to a recipient.
        </p>
        <div className="space-y-8">
          {CTF_PROTOCOL_CHAINS.map((c) => (
            <VaultPanel key={c.id} chainId={c.id} label={c.name} />
          ))}
        </div>
      </section>

      <section className="border-border/80 bg-card/30 space-y-3 rounded-lg border p-6">
        <h2 className="text-primary font-mono text-sm tracking-wide uppercase">
          Treasury.sol (Uniswap swap treasury)
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          The full <code className="font-mono text-xs">Treasury.sol</code> in the repo adds{" "}
          <code className="font-mono text-xs">convertToWeth</code>, <code className="font-mono text-xs">unwrapWethToEth</code>,{" "}
          <code className="font-mono text-xs">withdrawToken</code>, <code className="font-mono text-xs">withdrawNativeToken</code>,{" "}
          <code className="font-mono text-xs">setTokenSupported</code>, etc. It is <strong className="text-foreground">not</strong> wired
          to the default testnet deploy (needs WETH + SwapRouter per chain). Use it when you deploy with DEX addresses; the pages above
          cover the minimal native vault used as <code className="font-mono text-xs">protocolTreasury</code> today.
        </p>
      </section>
    </div>
  )
}

function VaultPanel({ chainId, label }: { chainId: number; label: string }) {
  const vault = getProtocolTreasuryAddressForChain(chainId)
  const { address, isConnected } = useConnection()
  const activeChain = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const { writeContractAsync, isPending: isWriting } = useWriteContract()

  const { data: owner } = useReadContract({
    address: vault,
    abi: protocolTreasuryVaultAbi,
    functionName: "owner",
    chainId,
    query: { enabled: !!vault },
  })

  const { data: bal, refetch: refetchBal } = useBalance({
    address: vault,
    chainId,
    query: { enabled: !!vault },
  })

  const wrongChain = isConnected && activeChain !== chainId
  const isOwner =
    !!address &&
    !!owner &&
    isAddressEqual(owner as Address, address as Address)

  const [to, setTo] = React.useState("")
  const [amountEth, setAmountEth] = React.useState("")
  const [err, setErr] = React.useState<string | null>(null)

  if (!vault) {
    return (
      <div>
        <h3 className="text-foreground font-mono text-sm">{label}</h3>
        <p className="text-muted-foreground mt-1 text-xs">
          No <code className="font-mono">ProtocolTreasury</code> in addresses for chain {chainId}.
        </p>
      </div>
    )
  }

  return (
    <div className="border-border/60 space-y-3 rounded-md border border-dashed p-4">
      <h3 className="text-foreground font-mono text-sm">
        {label} · chain {chainId}
      </h3>
      <p className="text-muted-foreground font-mono text-xs break-all">Vault: {vault}</p>
      <p className="text-muted-foreground font-mono text-xs">
        Balance: {bal != null ? `${formatEther(bal.value)} ${bal.symbol}` : "—"}
      </p>
      <p className="text-muted-foreground font-mono text-xs">
        Owner: {owner ?? "—"}
      </p>

      {!isConnected ? (
        <p className="text-muted-foreground text-xs">Connect wallet to manage this chain.</p>
      ) : wrongChain ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="font-mono text-xs"
          disabled={isSwitching}
          onClick={() => switchChain({ chainId })}
        >
          {isSwitching ? "…" : `Switch to ${label}`}
        </Button>
      ) : !isOwner ? (
        <p className="text-muted-foreground text-xs">
          Only the vault owner can withdraw. You are not the owner on this chain.
        </p>
      ) : (
        <div className="mt-2 space-y-2">
          <label className="block space-y-1">
            <span className="text-muted-foreground font-mono text-[10px] uppercase">Recipient</span>
            <input
              className={inputClass}
              placeholder="0x…"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-muted-foreground font-mono text-[10px] uppercase">Amount (native)</span>
            <input
              className={inputClass}
              placeholder="0.01"
              value={amountEth}
              onChange={(e) => setAmountEth(e.target.value)}
            />
          </label>
          {err ? <p className="text-destructive text-xs">{err}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="font-mono text-xs"
              disabled={
                isWriting ||
                !to.startsWith("0x") ||
                !amountEth.trim()
              }
              onClick={async () => {
                setErr(null)
                try {
                  const wei = parseEther(amountEth.trim() as `${string}`)
                  await writeContractAsync({
                    address: vault,
                    abi: protocolTreasuryVaultAbi,
                    functionName: "withdraw",
                    args: [to as Address, wei],
                    chainId,
                  })
                  void refetchBal()
                  setAmountEth("")
                } catch (e) {
                  setErr(e instanceof Error ? e.message : "Withdraw failed.")
                }
              }}
            >
              {isWriting ? <Loader2 className="size-4 animate-spin" /> : "withdraw"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="font-mono text-xs"
              disabled={!bal?.value}
              onClick={() => setAmountEth(formatEther(bal?.value ?? 0n))}
            >
              Use full balance
            </Button>
          </div>
        </div>
      )}

      <p className="text-muted-foreground text-[11px] leading-relaxed">
        To fund the vault manually (not via Registry), send native token to the vault address on {label} from any wallet.
      </p>
    </div>
  )
}
