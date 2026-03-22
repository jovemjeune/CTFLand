import type { Metadata } from "next"
import { headers } from "next/headers"
import { cookieToInitialState } from "wagmi"

import "@workspace/ui/globals.css"
import { Providers } from "@/components/providers"
import { SiteShell } from "@/components/site-shell"
import { ThemeProvider } from "@/components/theme-provider"
import { wagmiConfig } from "@/lib/wagmi-config"
import { cn } from "@workspace/ui/lib/utils"

export const metadata: Metadata = {
  title: {
    default: "CTFLand — Verify. Compete. Get Paid.",
    template: "%s · CTFLand",
  },
  description:
    "World ID–verified, collateral-backed competition network: 48-hour challenges, credentialed judges & triage, payouts encoded on-chain.",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookie = (await headers()).get("cookie")
  const initialState = cookieToInitialState(wagmiConfig, cookie)

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("dark antialiased")}
    >
      <body className="bg-background font-sans">
        <ThemeProvider>
          <Providers initialState={initialState}>
            <SiteShell>{children}</SiteShell>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
