import Link from "next/link"

import { Button } from "@workspace/ui/components/button"

export default function HomePage() {
  return (
    <div className="flex flex-col gap-14">
      <section className="relative pt-4">
        <p className="text-primary font-mono text-xs tracking-[0.4em] uppercase">
          Competition layer
        </p>
        <h1 className="ctf-text-glow mt-4 max-w-3xl font-mono text-3xl leading-tight tracking-tight sm:text-4xl">
          Where serious security meets fair play —{" "}
          <span className="text-foreground/90">
            sybil-resistant, collateral-backed, rule-bound payouts.
          </span>
        </h1>
        <p className="text-muted-foreground mt-6 max-w-2xl text-base leading-relaxed">
          CTFLand is a World ID–verified, collateral-backed competition network
          for 48-hour security, CTF, hiring, and hackathon challenges. Judges and
          triage carry proven credibility; sponsors can&apos;t casually walk
          away; competitors are paid by mechanics, not goodwill.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild size="lg" className="font-mono text-xs tracking-wide">
            <Link href="/competitors">Enter as competitor</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="font-mono text-xs tracking-wide"
          >
            <Link href="/roles">Explore roles</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="font-mono text-xs tracking-wide"
          >
            <Link href="/economics">Read the economics</Link>
          </Button>
        </div>
      </section>

      <section className="border-border/80 bg-card/30 rounded-lg border p-6">
        <h2 className="text-primary font-mono text-xs tracking-[0.35em] uppercase">
          Roles
        </h2>
        <p className="text-muted-foreground mt-3 max-w-3xl text-sm leading-relaxed">
          Competitor (World ID + Competitor NFT), credentialed{" "}
          <Link className="text-primary underline-offset-4 hover:underline" href="/judges">
            judges &amp; triage
          </Link>
          , bound{" "}
          <Link className="text-primary underline-offset-4 hover:underline" href="/sponsor">
            sponsors
          </Link>
          , and protocol coordination for private briefs in General CTF — all
          described in the{" "}
          <Link className="text-primary underline-offset-4 hover:underline" href="/roles">
            roles hub
          </Link>
          .
        </p>
      </section>

      <section className="grid gap-6 sm:grid-cols-3">
        {[
          {
            title: "48h rhythm",
            body: "One clock for submit and momentum — the same constraint as real contest finals.",
          },
          {
            title: "Hidden equilibria",
            body: "General CTF mode keeps winning conditions private between sponsor and protocol — competitors hunt; judges verify first correct.",
          },
          {
            title: "Enforced splits",
            body: "Registry routes stake through BPS paths aligned with Pitch.md — triage on or off, treasury skim, collateral discipline.",
          },
        ].map((card) => (
          <div
            key={card.title}
            className="border-border/80 bg-card/40 rounded-lg border p-5 shadow-[0_0_0_1px_oklch(0.35_0.06_150_/_12%)]"
          >
            <h2 className="text-primary font-mono text-sm tracking-wide uppercase">
              {card.title}
            </h2>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
              {card.body}
            </p>
          </div>
        ))}
      </section>

      <section className="border-border/60 rounded-lg border border-dashed p-8">
        <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
          One-liner stack
        </p>
        <p className="mt-4 max-w-3xl font-mono text-sm leading-relaxed sm:text-base">
          World ID + Competitor NFT → 48-hour sprints → credentialed judges &amp;
          triage → collateral-backed sponsor promises → payouts that respect
          competitors first.
        </p>
      </section>
    </div>
  )
}
