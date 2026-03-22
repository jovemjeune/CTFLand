import type { Metadata } from "next"
import Link from "next/link"

import { Button } from "@workspace/ui/components/button"

import { ContributorIdentityCheck } from "@/components/contributor-identity-check"

export const metadata: Metadata = {
  title: "Competitors",
  description:
    "World ID, Competitor NFT, and competitor profile — sybil resistance with receipts.",
}

export default function CompetitorsPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <header>
        <h1 className="font-mono text-2xl tracking-tight sm:text-3xl">
          COMPETITORS
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          To compete and submit, verify as a unique human and hold an on-chain
          competitor credential tied to that verification.
        </p>
        <div className="mt-4">
          <Button asChild className="font-mono text-xs tracking-wide" size="sm">
            <Link href="/profile">Open competitor profile</Link>
          </Button>
        </div>
      </header>

      <section className="border-border/80 bg-card/30 space-y-4 rounded-lg border p-6">
        <h2 className="text-primary font-mono text-sm tracking-wide uppercase">
          1 · World ID
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Proof of unique personhood so one human isn&apos;t farming the
          leaderboard with sock puppets. This is sybil resistance with receipts
          — aligned with how high-stakes security work should be gated. The
          further information can be found at below link.
        </p>
        <a
          className="text-primary inline-flex font-mono text-xs tracking-wide underline-offset-4 hover:underline"
          href="https://world.org/world-id"
          target="_blank"
          rel="noreferrer"
        >
          world.org/world-id →
        </a>
      </section>

      <section className="border-border/80 bg-card/30 space-y-4 rounded-lg border p-6">
        <h2 className="text-primary font-mono text-sm tracking-wide uppercase">
          2 · Competitor NFT
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          An on-chain credential tied to your verification gates submissions and
          keeps the field human-scale. Pair it with{" "}
          <code className="text-primary bg-muted/50 rounded px-1 font-mono text-xs">
            setCompetitorPayee
          </code>{" "}
          on the Registry when you&apos;re in the payout set.
        </p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          That wiring is <strong className="text-foreground">not automatic</strong>{" "}
          — the protocol does not discover payees for you. A sponsor or operator must
          call <code className="font-mono text-xs">setCompetitorPayee</code> with your
          wallet so rewards can route when you&apos;re in the winner / payout set.
        </p>
      </section>

      <ContributorIdentityCheck />
    </div>
  )
}
