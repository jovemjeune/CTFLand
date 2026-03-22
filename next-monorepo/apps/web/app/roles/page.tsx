import type { Metadata } from "next"
import Link from "next/link"

import { Button } from "@workspace/ui/components/button"

import { PROTOCOL_SUPPORTED_NETWORKS_LINE } from "@/lib/protocol-networks"

export const metadata: Metadata = {
  title: "Roles",
  description:
    "Competitor, judge, triage, sponsor, and protocol roles in CTFLand — aligned with Pitch.md.",
}

const roles = [
  {
    id: "competitor",
    title: "Competitor",
    pitch:
      "Verify with World ID and hold a Competitor NFT to submit in challenges — sybil resistance with receipts.",
    href: "/competitors",
    cta: "Competitors",
  },
  {
    id: "judge",
    title: "Judge",
    pitch:
      "At least one High-severity (or stronger) finding on Immunefi, Sherlock, CodeHawks, Code4rena, or Cantina. Applications that don’t clear are rejected.",
    href: "/judges#judge",
    cta: "Judge credentials",
  },
  {
    id: "triage",
    title: "Triage",
    pitch:
      "At least USD 10,000 in documented payouts / earnings across those same ecosystems. Triage NFT marks credentials when configured on-chain.",
    href: "/judges#triage",
    cta: "Triage credentials",
  },
  {
    id: "sponsor",
    title: "Sponsor",
    pitch:
      "Post reward plus collateral; live challenges aren’t cancelled on a whim. Forfeited collateral aligns incentives with participants.",
    href: "/sponsor",
    cta: "Sponsor economics",
  },
  {
    id: "protocol",
    title: "Protocol team",
    pitch:
      "In General CTF, the winning condition may be shared privately between sponsor and protocol so judges and competitors aren’t all on the same public brief. Registry and treasury live on-chain.",
    href: "/protocol",
    cta: "Registry & contracts",
  },
] as const

export default function RolesPage() {
  return (
    <div className="flex flex-col gap-12">
      <header className="max-w-3xl">
        <h1 className="font-mono text-2xl tracking-tight sm:text-3xl">
          Roles in CTFLand
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          Every challenge runs on clear roles: who verifies, who judges, who
          triages, who funds, and how the protocol coordinates outcomes. This
          mirrors the product pitch — credentialed
          benches, bound sponsors, competitors first in the split.
        </p>
        <p className="text-muted-foreground mt-4 rounded-md border border-border/80 bg-card/30 px-3 py-2 font-mono text-[11px] leading-relaxed">
          <span className="text-primary">Networks · </span>
          This app connects only to{" "}
          <span className="text-foreground">{PROTOCOL_SUPPORTED_NETWORKS_LINE}</span>
          . Other chains are not supported for this deployment.
        </p>
      </header>

      <ul className="flex flex-col gap-5">
        {roles.map((r) => (
          <li
            key={r.id}
            id={r.id}
            className="border-border/80 bg-card/30 scroll-mt-24 rounded-lg border p-6"
          >
            <h2 className="font-mono text-lg tracking-tight">{r.title}</h2>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
              {r.pitch}
            </p>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="mt-4 font-mono text-xs tracking-wide"
            >
              <Link href={r.href}>{r.cta}</Link>
            </Button>
          </li>
        ))}
      </ul>

      <section className="border-border/60 rounded-lg border border-dashed p-6">
        <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
          Five modes
        </p>
        <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-relaxed">
          Audit, bounty, general, job, and hackathon tracks change who judges,
          whether triage is on, and what stays private — see{" "}
          <Link className="text-primary font-mono underline-offset-4 hover:underline" href="/modes">
            Modes of play
          </Link>
          .
        </p>
      </section>
    </div>
  )
}
