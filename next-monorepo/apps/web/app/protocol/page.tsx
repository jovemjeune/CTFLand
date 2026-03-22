import type { Metadata } from "next"
import { isAddressEqual, zeroAddress } from "viem"

import { CrossChainPassportCard } from "@/components/cross-chain-passport-card"
import { fetchRegistrySnapshot } from "@/lib/registry-read"
import { bpsToPercentLabel } from "@/lib/format"

export const metadata: Metadata = {
  title: "Protocol",
  description: "Read-only Registry constants and linked contracts.",
}

export const revalidate = 30

function ShortAddr({ value }: { value: string }) {
  return (
    <code className="text-primary bg-muted/40 rounded px-1.5 py-0.5 font-mono text-xs break-all">
      {value}
    </code>
  )
}

export default async function ProtocolPage() {
  const snap = await fetchRegistrySnapshot()

  if (!snap.ok && snap.reason === "missing_registry") {
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="font-mono text-2xl tracking-tight">On-chain Registry</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Set{" "}
          <code className="text-primary font-mono text-xs">
            NEXT_PUBLIC_REGISTRY_ADDRESS
          </code>{" "}
          (or add <code className="text-primary font-mono text-xs">Registry</code>{" "}
          for your chain in{" "}
          <code className="font-mono text-xs">lib/contract-addresses.json</code>
          ) and{" "}
          <code className="text-primary font-mono text-xs">
            NEXT_PUBLIC_RPC_URL
          </code>{" "}
          (and{" "}
          <code className="text-primary font-mono text-xs">
            NEXT_PUBLIC_CHAIN_ID
          </code>{" "}
          — use <span className="text-foreground font-mono">43113</span>{" "}
          Avalanche Fuji or{" "}
          <span className="text-foreground font-mono">421614</span> Arbitrum Sepolia
          only) in{" "}
          <code className="font-mono text-xs">apps/web/.env.local</code> to load
          live BPS splits and contract links.
        </p>
      </div>
    )
  }

  if (!snap.ok) {
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="font-mono text-2xl tracking-tight">On-chain Registry</h1>
        <p className="text-destructive text-sm">
          Could not read the registry: {snap.detail ?? "unknown error"}
        </p>
      </div>
    )
  }

  const { bps, address, chainId, sponsorNFT, triageNFT, competitorNFT, protocolTreasury } =
    snap

  const treasuryUnset = isAddressEqual(protocolTreasury, zeroAddress)

  return (
    <div className="flex flex-col gap-10">
      <header>
        <h1 className="font-mono text-2xl tracking-tight sm:text-3xl">
          Registry snapshot
        </h1>
        <p className="text-muted-foreground mt-3 text-sm">
          Chain ID <span className="text-foreground font-mono">{chainId}</span>{" "}
          · Contract <ShortAddr value={address} />
        </p>
        <p className="text-muted-foreground mt-3 max-w-2xl text-xs leading-relaxed">
          World ID proves personhood in <span className="text-foreground">CompetitorNFT</span>{" "}
          at mint. The Registry can optionally point at that collection; when set, competitor
          payees / participants / job winners must hold a token (see{" "}
          <code className="font-mono text-[11px]">foundry/docs/IDENTITY_AND_REGISTRY.md</code>
          ).
        </p>
      </header>

      <section className="grid gap-6 sm:grid-cols-2">
        <div className="border-border/80 bg-card/30 rounded-lg border p-5">
          <h2 className="text-primary font-mono text-xs tracking-wide uppercase">
            With triage (pitch path)
          </h2>
          <ul className="text-muted-foreground mt-4 space-y-2 font-mono text-sm">
            <li className="flex justify-between gap-4">
              <span>Competitors</span>
              <span className="text-foreground">
                {bpsToPercentLabel(bps.withTriage.competitors)}
              </span>
            </li>
            <li className="flex justify-between gap-4">
              <span>Judges</span>
              <span className="text-foreground">
                {bpsToPercentLabel(bps.withTriage.judges)}
              </span>
            </li>
            <li className="flex justify-between gap-4">
              <span>Triage</span>
              <span className="text-foreground">
                {bpsToPercentLabel(bps.withTriage.triage)}
              </span>
            </li>
            <li className="flex justify-between gap-4">
              <span>Treasury</span>
              <span className="text-foreground">
                {bpsToPercentLabel(bps.withTriage.treasury)}
              </span>
            </li>
          </ul>
        </div>
        <div className="border-border/80 bg-card/30 rounded-lg border p-5">
          <h2 className="text-primary font-mono text-xs tracking-wide uppercase">
            No triage
          </h2>
          <ul className="text-muted-foreground mt-4 space-y-2 font-mono text-sm">
            <li className="flex justify-between gap-4">
              <span>Competitors</span>
              <span className="text-foreground">
                {bpsToPercentLabel(bps.noTriage.competitors)}
              </span>
            </li>
            <li className="flex justify-between gap-4">
              <span>Judges</span>
              <span className="text-foreground">
                {bpsToPercentLabel(bps.noTriage.judges)}
              </span>
            </li>
            <li className="flex justify-between gap-4">
              <span>Treasury</span>
              <span className="text-foreground">
                {bpsToPercentLabel(bps.noTriage.treasury)}
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="border-border/80 bg-card/30 rounded-lg border p-5">
        <h2 className="text-primary font-mono text-xs tracking-wide uppercase">
          Other constants
        </h2>
        <ul className="text-muted-foreground mt-4 space-y-2 font-mono text-sm">
          <li className="flex flex-wrap justify-between gap-2">
            <span>BPS denominator</span>
            <span className="text-foreground">{bps.denominator.toString()}</span>
          </li>
          <li className="flex flex-wrap justify-between gap-2">
            <span>Punish participant (collateral leg)</span>
            <span className="text-foreground">
              {bpsToPercentLabel(bps.punishParticipantBps)}
            </span>
          </li>
        </ul>
      </section>

      <CrossChainPassportCard />

      <section className="border-border/80 bg-card/30 rounded-lg border p-5">
        <h2 className="text-primary font-mono text-xs tracking-wide uppercase">
          Linked addresses
        </h2>
        <dl className="text-muted-foreground mt-4 space-y-3 font-mono text-xs sm:text-sm">
          <div>
            <dt className="text-foreground/80">Sponsor NFT</dt>
            <dd className="mt-1">
              <ShortAddr value={sponsorNFT} />
            </dd>
          </div>
          <div>
            <dt className="text-foreground/80">Triage NFT</dt>
            <dd className="mt-1">
              <ShortAddr value={triageNFT} />
            </dd>
          </div>
          <div>
            <dt className="text-foreground/80">Competitor NFT (optional gate)</dt>
            <dd className="mt-1">
              {competitorNFT ===
              "0x0000000000000000000000000000000000000000" ? (
                <span className="text-muted-foreground">Not set — no on-chain competitor check</span>
              ) : (
                <ShortAddr value={competitorNFT} />
              )}
            </dd>
          </div>
          <div>
            <dt className="text-foreground/80">Protocol treasury</dt>
            <dd className="mt-1">
              {treasuryUnset ? (
                <span className="text-destructive text-sm leading-relaxed">
                  Not set (zero address) — reward distribution will revert until configured. Run{" "}
                  <code className="font-mono text-xs">
                    foundry/script/deploy/configure_protocol_treasury.sh
                  </code>{" "}
                  (see <code className="font-mono text-xs">foundry/GETTING_STARTED.md</code> §7).
                </span>
              ) : (
                <ShortAddr value={protocolTreasury} />
              )}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  )
}
