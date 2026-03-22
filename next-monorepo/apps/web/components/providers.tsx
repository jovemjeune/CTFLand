"use client"

import * as React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { State } from "wagmi"
import { WagmiProvider } from "wagmi"

import { wagmiConfig } from "@/lib/wagmi-config"

/**
 * TanStack Query is a required peer dependency of wagmi — hooks like `useConnect`
 * and `useConnection` are implemented with it. It is not optional while using wagmi React.
 */
export function Providers({
  children,
  initialState,
}: {
  children: React.ReactNode
  initialState?: State
}) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000 },
        },
      }),
  )

  return (
    <WagmiProvider
      config={wagmiConfig}
      initialState={initialState}
      reconnectOnMount
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}
