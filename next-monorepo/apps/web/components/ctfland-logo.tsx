import { cn } from "@workspace/ui/lib/utils"

type Props = {
  className?: string
  /** Compact wordmark for mobile nav */
  compact?: boolean
}

/** Stylized CTFLand wordmark — matrix nodes + phosphor green, game-theory undertone. */
export function CtflandLogo({ className, compact }: Props) {
  if (compact) {
    return (
      <svg
        className={cn("h-8 w-auto text-primary", className)}
        viewBox="0 0 120 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <title>CTFLand</title>
        <defs>
          <linearGradient id="ctf-compact-g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.95" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        <text
          x="4"
          y="28"
          fill="url(#ctf-compact-g)"
          style={{
            fontFamily: "var(--font-mono), ui-monospace, monospace",
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: "0.35em",
          }}
        >
          CTF
        </text>
      </svg>
    )
  }

  return (
    <svg
      className={cn("h-14 w-auto max-w-[min(100%,280px)]", className)}
      viewBox="0 0 320 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <title>CTFLand</title>
      <defs>
        <linearGradient id="ctf-fill" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="oklch(0.78 0.22 145)" />
          <stop offset="55%" stopColor="oklch(0.62 0.18 150)" />
          <stop offset="100%" stopColor="oklch(0.45 0.12 155)" />
        </linearGradient>
        <filter id="ctf-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Hidden strategy grid — payoff lattice */}
      <g opacity="0.35" stroke="oklch(0.45 0.12 150)" strokeWidth="0.4">
        {[0, 1, 2, 3, 4].map((i) => (
          <line
            key={`h-${i}`}
            x1="8"
            y1={14 + i * 10}
            x2="108"
            y2={14 + i * 10}
          />
        ))}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <line
            key={`v-${i}`}
            x1={8 + i * 10}
            y1="14"
            x2={8 + i * 10}
            y2="54"
          />
        ))}
      </g>
      {/* Nodes — players */}
      <g fill="oklch(0.55 0.14 145)">
        <circle cx="28" cy="24" r="2.2" />
        <circle cx="58" cy="44" r="2.2" />
        <circle cx="88" cy="34" r="2.2" />
      </g>
      <g stroke="oklch(0.5 0.1 150 / 0.5)" strokeWidth="0.6">
        <line x1="28" y1="24" x2="58" y2="44" />
        <line x1="58" y1="44" x2="88" y2="34" />
        <line x1="28" y1="24" x2="88" y2="34" />
      </g>
      <text
        x="118"
        y="44"
        fill="url(#ctf-fill)"
        filter="url(#ctf-soft)"
        style={{
          fontFamily: "var(--font-mono), ui-monospace, monospace",
          fontSize: 32,
          fontWeight: 600,
          letterSpacing: "0.12em",
        }}
      >
        CTFLAND
      </text>
      <text
        x="118"
        y="62"
        fill="oklch(0.55 0.08 150)"
        style={{
          fontFamily: "var(--font-mono), ui-monospace, monospace",
          fontSize: 9,
          letterSpacing: "0.30em",
          textTransform: "uppercase",
        }}
      >
        verify · compete · settle
      </text>
    </svg>
  )
}
