# World ID (CTFLand)

Read the **[World ID overview](https://docs.world.org/world-id/overview)** first: it explains proof-of-human credentials, Sybil resistance, and privacy. CTFLand uses **Orb (Proof of Human)** verification via IDKit so competitors are unique humans without sharing personal data with CTFLand beyond the ZK proof—aligned with “one person, one competitor credential” in the pitch.

**Configure**

1. **[Developer Portal](https://developer.worldcoin.org/)** — create an app; copy **App ID** → `NEXT_PUBLIC_WORLD_APP_ID`.
2. Create an **action** for this flow; set **action** → `NEXT_PUBLIC_WORLD_ACTION` (must match your `CompetitorNFT` / external nullifier setup).
3. Optional **description** → `NEXT_PUBLIC_WORLD_ACTION_DESCRIPTION` (shown in World App).
4. IDKit uses the connected wallet as **signal** for `claimWithWorldId`.

Integration details: [IDKit](https://docs.world.org/world-id/idkit/integrate). Env keys: `apps/web/.env.example`.

**Troubleshooting — “Set NEXT_PUBLIC_WORLD_APP_ID” never goes away**

1. Put the variable under **`next-monorepo/apps/web/.env.local`** (or `.env` in that folder), **not** only in the repo root — Next.js only loads env from the web app directory.
2. App ID must look like **`app_staging_…`** or **`app_…`** (must start with `app_`). No spaces; avoid wrapping in quotes unless the whole value is quoted once in `.env`.
3. **Restart** `npm run dev` after any env change. **`NEXT_PUBLIC_*` is inlined at build time** — if you use `npm run start`, run **`npm run build`** again after changing env.
