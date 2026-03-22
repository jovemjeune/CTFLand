import Link from "next/link"

import { CtflandLogo } from "@/components/ctfland-logo"
import { WalletButton } from "@/components/wallet-button"

const nav = [
  { href: "/", label: "Home" },
  { href: "/roles", label: "Roles" },
  { href: "/modes", label: "Modes" },
  { href: "/economics", label: "Economics" },
  { href: "/competitors", label: "COMPETITORS" },
  { href: "/judges", label: "Judges" },
  { href: "/sponsor", label: "Sponsor" },
  { href: "/protocol", label: "Protocol" },
  { href: "/protocol#ccrp", label: "CCRP" },
  { href: "/mirror", label: "Mirror" },
  { href: "/treasury", label: "Treasury" },
  { href: "/profile", label: "Profile" },
] as const

export function SiteHeader() {
  return (
    <header className="border-border/80 relative z-20 border-b bg-background/80 backdrop-blur-md">
      <div className="ctf-vignette pointer-events-none absolute inset-0 opacity-70" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-3 outline-none"
        >
          <span className="hidden sm:block">
            <CtflandLogo />
          </span>
          <span className="sm:hidden">
            <CtflandLogo compact />
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs tracking-wide uppercase">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[10.5rem] sm:ml-auto sm:shrink-0">
          <WalletButton />
        </div>
      </div>
    </header>
  )
}
