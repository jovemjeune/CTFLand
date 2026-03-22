# shadcn/ui monorepo template

This is a Next.js monorepo template with shadcn/ui.

## Run the web app

From the repo root (`next-monorepo/`):

```bash
# Development — hot reload; use this while editing UI
npm run dev

# Production server — serves the last build; rebuild after code changes
npm run build
npm run start
```

From **`apps/web/`** (same scripts via the workspace):

```bash
npm run dev    # ← correct for local development
npm run build && npm run start   # production-like
```

**Do not run `npm start dev`.** That executes the **`start`** script and passes `dev` to `next start`, so Next looks for a folder named `dev` and errors (`Invalid project directory`). For development you want **`npm run dev`** (the script named `dev`), not `start` + an argument.

Routing is **Next.js App Router** (`apps/web/app/`), not React Router — see [`docs/ROUTING.md`](docs/ROUTING.md). If **`npm run start`** shows an old UI, run **`npm run build`** again (or use **`npm run dev`** while developing).

Do **not** use `npx run start` — that is a different tool and will fail. Use **`npm run start`** (or `npm run start --workspace=web`).

## Competitor profile + World ID

See [World ID overview](https://docs.world.org/world-id/overview) and [`docs/WORLD_ID.md`](docs/WORLD_ID.md). Copy `apps/web/.env.example` → `apps/web/.env.local`, fill **`NEXT_PUBLIC_WORLD_APP_ID`**, **`NEXT_PUBLIC_WORLD_ACTION`**, and either **`NEXT_PUBLIC_COMPETITOR_NFT_ADDRESS`** / **`NEXT_PUBLIC_REGISTRY_ADDRESS`** or rely on **`apps/web/lib/contract-addresses.json`** (generated from the repo root **`contract_addresses.json`** when you run `foundry/script/deploy/deploy_both_testnets.sh`).

Open **`/profile`** — IDKit verifies (Orb), then `claimWithWorldId` (signal = wallet address).

## Security (Cloudflare / Sentry)

See [`docs/SECURITY.md`](docs/SECURITY.md).

## Adding components

To add components to your app, run the following command at the root of your `web` app:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

This will place the ui components in the `packages/ui/src/components` directory.

## Using components

To use the components in your app, import them from the `ui` package.

```tsx
import { Button } from "@workspace/ui/components/button";
```
