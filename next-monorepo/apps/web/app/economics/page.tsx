import type { Metadata } from "next"
import Link from "next/link"

import { PROTOCOL_SUPPORTED_NETWORKS_LINE } from "@/lib/protocol-networks"

export const metadata: Metadata = {
  title: "Economics",
  description:
    "Sponsor collateral, payout splits with and without triage, and forfeiture mechanics.",
}

export default function EconomicsPage() {
  return (
    <div className="flex flex-col gap-12">
      <header>
        <h1 className="font-mono text-2xl tracking-tight sm:text-3xl">
          Economics
        </h1>
        <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-relaxed">
          Sponsors post reward plus collateral up front. Unresponsiveness routes
          value by rules — not vibes. On resolve,{" "}
          <code className="text-primary bg-muted/50 rounded px-1 py-0.5 font-mono text-xs">
            Registry.distributeRewards
          </code>{" "}
          splits the staked pool per the active BPS path.
        </p>
        <p className="text-muted-foreground mt-4 max-w-2xl rounded-md border border-border/80 bg-card/30 px-3 py-2 font-mono text-[11px] leading-relaxed">
          On-chain reads for this app use{" "}
          <span className="text-foreground">{PROTOCOL_SUPPORTED_NETWORKS_LINE}</span>{" "}
          only. See{" "}
          <Link className="text-primary hover:underline" href="/roles">
            Roles
          </Link>{" "}
          for how sponsor, judge, triage, and competitor legs interact.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="border-border/80 bg-card/30 rounded-lg border p-6">
          <h2 className="text-primary font-mono text-sm tracking-wide uppercase">
            Sponsor commitment
          </h2>
          <ul className="text-muted-foreground mt-4 list-inside list-disc space-y-2 text-sm leading-relaxed">
            <li>Live challenges aren&apos;t cancelled on a whim.</li>
            <li>
              Advertised reward plus ~10% collateral is posted up front (see
              pitch for exact policy).
            </li>
            <li>
              Forfeited collateral is distributed to participants — staking money
              means staking attention.
            </li>
          </ul>
        </div>
        <div className="border-border/80 bg-card/30 rounded-lg border p-6">
          <h2 className="text-primary font-mono text-sm tracking-wide uppercase">
            Healthy path + triage
          </h2>
          <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
            When triage is active and the sponsor is responsive:{" "}
            <strong className="text-foreground">85%</strong> competitors,{" "}
            <strong className="text-foreground">10%</strong> judges,{" "}
            <strong className="text-foreground">4%</strong> triage,{" "}
            <strong className="text-foreground">1%</strong> protocol treasury.
          </p>
        </div>
        <div className="border-border/80 bg-card/30 rounded-lg border p-6">
          <h2 className="text-primary font-mono text-sm tracking-wide uppercase">
            Judges, no triage
          </h2>
          <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
            <strong className="text-foreground">85%</strong> competitors,{" "}
            <strong className="text-foreground">14%</strong> judges,{" "}
            <strong className="text-foreground">1%</strong> protocol treasury.
          </p>
        </div>
        <div className="border-border/80 bg-card/30 rounded-lg border p-6">
          <h2 className="text-primary font-mono text-sm tracking-wide uppercase">
            Unresponsive paths
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            When benches go quiet or sponsors ghost, liquidity follows policy
            branches — <code className="text-primary font-mono">punishOffer</code>{" "}
            / <code className="text-primary font-mono">publicPunish</code> handle
            collateral. Some sponsor-reclaim scenarios remain governance or
            future state-machine work — see Pitch.md.
          </p>
        </div>
      </section>
    </div>
  )
}
