import type { ReactNode } from "react"

import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="ctf-grid text-foreground relative min-h-svh">
      <SiteHeader />
      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}
