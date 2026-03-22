import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Modes of play",
  description:
    "CTF audit, bounty, general, job, and hackathon tracks — roles and triage per Pitch.md.",
}

const modes = [
  {
    name: "CTF — Security audit",
    summary:
      "Focused smart-contract and protocol security. Submissions are evaluated through a structured lens.",
    bullets: [
      "Judges, triage, and sponsors each play a defined part in the outcome.",
    ],
  },
  {
    name: "CTF — Security bounty",
    summary:
      "Same security DNA as the audit track, extended to Web2 + Web3 attack surfaces.",
    bullets: [
      "Judge, triage, and sponsor participation keeps quality and accountability high.",
    ],
  },
  {
    name: "CTF — General",
    summary:
      "The classical CTF spirit — mystery and speed — with a private winning condition.",
    bullets: [
      "The sponsor (proposer) shares the winning condition with the protocol team through a private channel — judges and competitors are not all on the same public brief.",
      "Competitors hunt for the solution; judges validate the first correct submission.",
      "No triage on this track: it stays highly personalized to the proposer’s puzzle design.",
      "On multi-challenge CTFs, first correct solve and first correct judgement can both earn tiered rewards.",
    ],
  },
  {
    name: "CTF — Job",
    summary: "A company-run competition — build the fastest demo, earn a seat on the team.",
    bullets: [
      "Judging is by the sponsor (the company).",
      "Judges and triage from the platform are excluded — it’s the employer’s hire signal, not a public audit contest.",
      "If the role is explicitly Web2 or Web3 security, triage may still be activated; otherwise the company runs the show end-to-end.",
    ],
  },
  {
    name: "CTF — Hackathon",
    summary: "Builder energy with platform rules.",
    bullets: [
      "Building a security application? The proposer can activate triage for security relevance.",
      "Otherwise, triage stays off.",
      "Sponsors step in as judges if no qualified volunteer judges join — so the event still ships a verdict.",
    ],
  },
] as const

export default function ModesPage() {
  return (
    <div className="flex flex-col gap-10">
      <header>
        <h1 className="font-mono text-2xl tracking-tight sm:text-3xl">
          Five modes of play
        </h1>
        <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-relaxed">
          Across these modes, participants get <strong className="text-foreground">48 hours</strong>{" "}
          from the challenge clock to complete and submit. Same rhythm; what changes
          is who judges, whether triage is in the loop, and how much stays hidden
          from the public brief.
        </p>
      </header>
      <ol className="flex flex-col gap-6">
        {modes.map((m, i) => (
          <li
            key={m.name}
            className="border-border/80 bg-card/30 rounded-lg border p-6"
          >
            <div className="flex gap-4">
              <span className="text-primary font-mono text-sm tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-mono text-base tracking-tight">{m.name}</h2>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  {m.summary}
                </p>
                <ul className="text-muted-foreground mt-4 list-inside list-disc space-y-2 text-sm leading-relaxed">
                  {m.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <p className="text-muted-foreground text-sm leading-relaxed">
        See how roles map to each track on the{" "}
        <a className="text-primary font-mono underline-offset-4 hover:underline" href="/roles">
          Roles
        </a>{" "}
        page.
      </p>
    </div>
  )
}
