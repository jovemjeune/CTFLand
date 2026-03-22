#!/usr/bin/env node
/**
 * Reads broadcast/ConfigureProtocolTreasury.s.sol/<chainId>/run-latest.json and sets
 * `ProtocolTreasury` (ProtocolTreasuryVault address) on existing contract-addresses.json
 * without removing other keys (e.g. RegistryMirror).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = fileURLToPath(new URL(".", import.meta.url))
const REPO_ROOT = join(__dirname, "../../..")
const FOUNDRY = join(REPO_ROOT, "foundry")
const WEB_PATH = join(
  REPO_ROOT,
  "next-monorepo/apps/web/lib/contract-addresses.json",
)

function vaultFromBroadcast(chainId) {
  const p = join(
    FOUNDRY,
    "broadcast/ConfigureProtocolTreasury.s.sol",
    String(chainId),
    "run-latest.json",
  )
  if (!existsSync(p)) {
    console.warn(`skip ${chainId}: missing ${p}`)
    return null
  }
  const run = JSON.parse(readFileSync(p, "utf8"))
  for (const tx of run.transactions ?? []) {
    if (tx.transactionType === "CREATE" && tx.contractName === "ProtocolTreasuryVault") {
      return tx.contractAddress
    }
  }
  return null
}

const doc = JSON.parse(readFileSync(WEB_PATH, "utf8"))

for (const chainId of [421614, 43113]) {
  const vault = vaultFromBroadcast(chainId)
  if (!vault) continue
  const key = String(chainId)
  if (!doc.chains[key]) doc.chains[key] = {}
  doc.chains[key].ProtocolTreasury = vault
}

doc.generatedAt = new Date().toISOString()
writeFileSync(WEB_PATH, JSON.stringify(doc, null, 2) + "\n", "utf8")
console.log("updated", WEB_PATH)
