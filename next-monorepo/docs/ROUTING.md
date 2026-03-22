# Routing (CTFLand web)

This app uses the **[Next.js App Router](https://nextjs.org/docs/app)** (`next-monorepo/apps/web/app/`). There is **no `react-router`** in this repo — URLs come from the filesystem (`page.tsx`, `layout.tsx`, folders).

## Why edits don’t show up

| Command | What happens |
|--------|----------------|
| **`npm run dev`** (from `next-monorepo/`) | Hot reload; source changes show quickly. **Use this while developing.** |
| **`npm run start`** | Serves the **last `next build` output** only. Changing TSX **without** rebuilding keeps the old UI. |

After changing pages or components:

1. **Development:** run `npm run dev`, not `start`.
2. **Production-style:** `npm run build --workspace=web` then `npm run start` (or use root `npm run build` then `npm run start`).

The web `start` script runs **`scripts/ensure-build.mjs`**: if there is no `.next` build yet, it runs `next build` once. It does **not** rebuild on every file save — that would be `next dev`.

## Routes of note

- `/competitors` — Competitors landing (replaces old “Compete” content).
- `/compete` — redirects to `/competitors`.
