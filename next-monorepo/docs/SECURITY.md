# Security & reliability (hackathon-friendly)

This doc explains **optional** layers that help under demo traffic without locking you into paid plans.

## Cloudflare (DDoS / edge)

**Why:** Hides origin IP, absorbs volumetric noise, and gives you TLS at the edge. For a hackathon demo, the **free** tier is usually enough.

**Typical setup**

1. Add your domain to Cloudflare and point DNS to your host (Vercel, Fly, etc.).
2. Enable the **orange-cloud** proxy on `A`/`CNAME` records.
3. **SSL/TLS** → *Full (strict)* when your origin serves HTTPS.
4. Turn on **Bot Fight Mode** (free) or a simple **WAF** rule if you see abuse.
5. Optional: **Rate limiting** on `POST`/`api/*` if you add backend routes later.

Cloudflare does **not** replace app-level auth or input validation; it reduces noisy traffic before it hits Next.js.

## Sentry (errors)

**Why:** You see real stack traces when judges click around. **Optional:** leave `NEXT_PUBLIC_SENTRY_DSN` unset and the SDK stays inert.

Set in your host’s env:

- `NEXT_PUBLIC_SENTRY_DSN` — browser SDK
- `SENTRY_DSN` — server (can mirror the same DSN for small apps)
- `SENTRY_AUTH_TOKEN` + `SENTRY_ORG` + `SENTRY_PROJECT` — only if you want **source maps** in CI

## Next.js headers

`apps/web/next.config.mjs` sets baseline security headers (frame options, MIME sniffing, referrer policy, HSTS in production). Tune there if a host already injects overlapping headers to avoid duplicates.

## World ID & wallets

- Never commit **private keys** or **WalletConnect** secrets.
- Competitor flows use **public** env vars (`NEXT_PUBLIC_*`) by design; treat them as client-visible.
