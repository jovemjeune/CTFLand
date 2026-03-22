import Link from "next/link"

import { PROTOCOL_SUPPORTED_NETWORKS_LINE } from "@/lib/protocol-networks"

export function SiteFooter() {
  return (
    <footer className="border-border/60 mt-24 border-t py-10">
      <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col gap-4 px-4 font-mono text-[11px] tracking-wide sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p>CTFLand — verify. compete. get paid.</p>
          <p className="text-muted-foreground/80 max-w-md">
            Wallets: {PROTOCOL_SUPPORTED_NETWORKS_LINE} only.
          </p>
        </div>
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          <Link className="hover:text-primary transition-colors" href="/roles">
            Roles
          </Link>
          <Link className="hover:text-primary transition-colors" href="/protocol">
            On-chain
          </Link>
          <a
            className="hover:text-primary transition-colors"
            href="https://world.org/world-id"
            target="_blank"
            rel="noreferrer"
          >
            World ID
          </a>
        </p>
      </div>
    </footer>
  )
}
