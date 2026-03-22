#!/usr/bin/env node
/**
 * Reads Foundry broadcast `run-latest.json` for DeployCTFLandCoreTestnet and writes:
 *   - <repo>/contract_addresses.json
 *   - <repo>/next-monorepo/apps/web/lib/contract-addresses.json
 *
 * Usage (from repo root or foundry/):
 *   node foundry/script/deploy/merge-contract-addresses.mjs [chainId ...]
 *
 * Defaults: 421614 43113 (Arbitrum Sepolia, Avalanche Fuji).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, "../../..")
const FOUNDRY = join(REPO_ROOT, "foundry")
const WEB_LIB = join(REPO_ROOT, "next-monorepo/apps/web/lib")

const BROADCAST_GLOB = "broadcast/DeployCTFLandCoreTestnet.s.sol"

const NETWORK_BY_CHAIN = {
  421614: "arbitrum_sepolia",
  43113: "avalanche_fuji",
}

function loadRunLatest(chainId) {
  const p = join(FOUNDRY, BROADCAST_GLOB, String(chainId), "run-latest.json")
  if (!existsSync(p)) {
    console.warn(`skip chain ${chainId}: missing ${p}`)
    return null
  }
  return JSON.parse(readFileSync(p, "utf8"))
}

function extractCreates(run) {
  const out = {}
  for (const tx of run.transactions ?? []) {
    if (tx.transactionType !== "CREATE") continue
    const name = tx.contractName
    const addr = tx.contractAddress
    if (!name || !addr) continue
    out[name] = addr
  }
  return out
}

function main() {
  const chainIds =
    process.argv.length > 2
      ? process.argv.slice(2).map((s) => Number(s))
      : [421614, 43113]

  const chains = {}
  for (const id of chainIds) {
    const run = loadRunLatest(id)
    if (!run) continue
    const creates = extractCreates(run)
    chains[String(id)] = {
      network: NETWORK_BY_CHAIN[id] ?? `chain_${id}`,
      ...creates,
    }
  }

  const doc = {
    generatedAt: new Date().toISOString(),
    deployScript: "DeployCTFLandCoreTestnet",
    chains,
  }

  const rootPath = join(REPO_ROOT, "contract_addresses.json")
  writeFileSync(rootPath, JSON.stringify(doc, null, 2) + "\n", "utf8")
  console.log("wrote", rootPath)

  if (!existsSync(WEB_LIB)) mkdirSync(WEB_LIB, { recursive: true })
  const webPath = join(WEB_LIB, "contract-addresses.json")
  writeFileSync(webPath, JSON.stringify(doc, null, 2) + "\n", "utf8")
  console.log("wrote", webPath)
}

main()
