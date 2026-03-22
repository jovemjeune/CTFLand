"use client"

import * as Sentry from "@sentry/nextjs"
import Link from "next/link"
import { useEffect } from "react"

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureException(error)
    }
  }, [error])

  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground flex min-h-svh flex-col items-center justify-center gap-4 p-6 font-sans">
        <h1 className="font-mono text-lg">Something went wrong</h1>
        <p className="text-muted-foreground max-w-md text-center text-sm">
          An unexpected error occurred. If this persists, try again later.
        </p>
        <Link
          href="/"
          className="text-primary font-mono text-sm underline-offset-4 hover:underline"
        >
          Back home
        </Link>
      </body>
    </html>
  )
}
