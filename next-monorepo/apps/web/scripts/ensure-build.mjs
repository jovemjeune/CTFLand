#!/usr/bin/env node
/**
 * `next start` serves the last production build only. If `.next/BUILD_ID` is missing,
 * run `next build` once so `npm run start` works and picks up a real build.
 */
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const appRoot = join(__dirname, "..")
const buildIdPath = join(appRoot, ".next", "BUILD_ID")

if (!existsSync(buildIdPath)) {
  console.info("[web] No .next build found — running `next build`…")
  const result = spawnSync("npx", ["next", "build"], {
    cwd: appRoot,
    stdio: "inherit",
    shell: true,
    env: process.env,
  })
  process.exit(result.status ?? 1)
}
