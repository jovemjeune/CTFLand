import type { Metadata } from "next"
import Link from "next/link"

import { Button } from "@workspace/ui/components/button"

import { SponsorCtfCreate } from "@/components/sponsor-ctf-create"
import { PROTOCOL_SUPPORTED_NETWORKS_LINE } from "@/lib/protocol-networks"

export const metadata: Metadata = {
  title: "Sponsor",
  description:
    "Collateral-backed sponsor commitment — reward plus stake, predictable exits, Pitch.md economics.",
}

export default function SponsorPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <header>
        <h1 className="font-mono text-2xl tracking-tight sm:text-3xl">
          Sponsor role
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          Sponsors fund challenges and stay bound by rules: you can&apos;t cancel
          a live challenge casually, and you post{" "}
          <strong className="text-foreground">advertised reward plus ~10%
          collateral</strong> up front. Unresponsiveness routes value through
          protocol policy — not goodwill.
        </p>
        <p className="text-muted-foreground mt-4 rounded-md border border-border/80 bg-card/30 px-3 py-2 font-mono text-[11px] leading-relaxed">
          <span className="text-primary">Networks · </span>
          Deployments and wallet actions for this app use{" "}
          <span className="text-foreground">{PROTOCOL_SUPPORTED_NETWORKS_LINE}</span>{" "}
          only.
        </p>
      </header>

      <SponsorCtfCreate />

      <section className="border-border/80 bg-card/30 space-y-4 rounded-lg border p-6">
        <h2 className="text-primary font-mono text-sm tracking-wide uppercase">
          Modes where you lead
        </h2>
        <ul className="text-muted-foreground list-inside list-disc space-y-2 text-sm leading-relaxed">
          <li>
            <strong className="text-foreground">CTF — Job:</strong> judging is by
            you (the company); platform judges/triage are excluded unless
            security + triage is explicitly activated.
          </li>
          <li>
            <strong className="text-foreground">CTF — Hackathon:</strong> you may
            judge if no qualified volunteer judges join.
          </li>
          <li>
            <strong className="text-foreground">CTF — General:</strong> you share
            the winning condition with the protocol team through a private
            channel; competitors hunt; judges validate the first correct
            submission.
          </li>
        </ul>
      </section>

      <section className="border-border/80 bg-card/30 space-y-4 rounded-lg border p-6">
        <h2 className="text-primary font-mono text-sm tracking-wide uppercase">
          Economics
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Payout splits (with/without triage), treasury skim, and collateral
          forfeiture are documented on the Economics page and reflected in the
          on-chain Registry when resolved.
        </p>
        <Button asChild variant="outline" size="sm" className="font-mono text-xs">
          <Link href="/economics">Open economics</Link>
        </Button>
      </section>

      <p className="text-muted-foreground text-sm leading-relaxed">
        <Link
          className="text-primary font-mono underline-offset-4 hover:underline"
          href="/roles"
        >
          ← All roles
        </Link>
      </p>
    </div>
  )
}
