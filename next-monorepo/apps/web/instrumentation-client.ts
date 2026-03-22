import * as Sentry from "@sentry/nextjs"

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment:
      process.env.NEXT_PUBLIC_VERCEL_ENV ??
      process.env.NODE_ENV ??
      "development",
    /** Low sample for hackathon traffic; raise only if you need perf data. */
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.08 : 0,
    /** No session replay by default — lighter bundle & less PII surface. */
    integrations: [],
  })
}

export const onRouterTransitionStart = dsn
  ? Sentry.captureRouterTransitionStart
  : () => {}
