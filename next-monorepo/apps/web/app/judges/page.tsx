import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Judges & triage",
  description:
    "Credential bars for judges and triage — proof of credibility from Immunefi, Sherlock, CodeHawks, Code4rena, Cantina.",
}

export default function JudgesPage() {
  return (
    <div className="flex flex-col gap-10">
      <header>
        <h1 className="font-mono text-2xl tracking-tight sm:text-3xl">
          Judges &amp; triage
        </h1>
        <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-relaxed">
          We don&apos;t let just anyone wear the robe. Applications that
          don&apos;t clear the bar are rejected — full stop.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            className="text-primary bg-card/40 border-border/80 hover:bg-card/60 inline-flex items-center rounded-md border px-4 py-2 font-mono text-xs tracking-wide uppercase underline-offset-4 transition-colors hover:underline"
            href="/judges/apply"
          >
            Apply as judge
          </Link>
          <Link
            className="text-primary bg-card/40 border-border/80 hover:bg-card/60 inline-flex items-center rounded-md border px-4 py-2 font-mono text-xs tracking-wide uppercase underline-offset-4 transition-colors hover:underline"
            href="/triage/apply"
          >
            Apply for triage
          </Link>
        </div>
      </header>

      <section
        id="judge"
        className="scroll-mt-24 border-border/80 bg-card/30 space-y-4 rounded-lg border p-6"
      >
        <h2 className="text-primary font-mono text-sm tracking-wide uppercase">
          Judge
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          <strong className="text-foreground">Bar to apply:</strong> at least one
          High-severity (or stronger) finding on a recognized platform:{" "}
          <strong className="text-foreground">
            Immunefi, Sherlock, CodeHawks, Code4rena, or Cantina
          </strong>
          .
        </p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          In pitch economics, when triage is on and the path is healthy,{" "}
          <strong className="text-foreground">10%</strong> of the reward pool can
          route to judges (see{" "}
          <Link
            className="text-primary underline-offset-4 hover:underline"
            href="/economics"
          >
            Economics
          </Link>
          ). When triage is off, <strong className="text-foreground">14%</strong>{" "}
          can route to judges instead.
        </p>
      </section>

      <section
        id="triage"
        className="scroll-mt-24 border-border/80 bg-card/30 space-y-4 rounded-lg border p-6"
      >
        <h2 className="text-primary font-mono text-sm tracking-wide uppercase">
          Triage
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          <strong className="text-foreground">Bar to apply:</strong> at least{" "}
          <strong className="text-foreground">USD 10,000</strong> in documented
          payouts / earnings across those same ecosystems.
        </p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          When triage is active and the sponsor is responsive,{" "}
          <strong className="text-foreground">4%</strong> of the pool can route to
          triage (with a configured triage payout address on-chain).
        </p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Triage NFT integrations mark triage credentials for frontends and
          contracts — see the deployed{" "}
          <code className="text-primary bg-muted/50 rounded px-1 font-mono text-xs">
            triageNFT
          </code>{" "}
          on the{" "}
          <Link
            className="text-primary underline-offset-4 hover:underline"
            href="/protocol"
          >
            Protocol
          </Link>{" "}
          page when configured.
        </p>
      </section>

      <div className="overflow-x-auto rounded-lg border border-border/80">
        <table className="w-full min-w-[520px] text-left font-mono text-sm">
          <thead>
            <tr className="bg-card/50 border-b border-border/80">
              <th className="text-primary p-4 text-xs tracking-wide uppercase">
                Role
              </th>
              <th className="text-primary p-4 text-xs tracking-wide uppercase">
                Bar to apply
              </th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b border-border/60">
              <td className="text-foreground p-4">Judge</td>
              <td className="p-4">
                At least one High-severity (or stronger) finding on Immunefi,
                Sherlock, CodeHawks, Code4rena, or Cantina.
              </td>
            </tr>
            <tr>
              <td className="text-foreground p-4">Triage</td>
              <td className="p-4">
                At least USD 10,000 in documented payouts / earnings across those
                same ecosystems.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

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
