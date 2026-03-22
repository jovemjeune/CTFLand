#!/usr/bin/env node
/**
 * Merge CCIP deploy addresses into next-monorepo contract-addresses.json.
 * Run from `foundry/` after `finalize_ccip_testnet.sh`, or set env:
 *   CCIP_PASSPORT, CCIP_REGISTRY_MIRROR, CCIP_MIRROR_RECEIVER
 *
 * Usage: node script/deploy/merge-ccip-addresses.mjs
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const foundryRoot = path.join(__dirname, "../..")
const jsonPath = path.join(
  foundryRoot,
  "../next-monorepo/apps/web/lib/contract-addresses.json",
)

function addrFromBroadcast(scriptName, chainId, contractName) {
  const p = path.join(
    foundryRoot,
    "broadcast",
    `${scriptName}.s.sol`,
    String(chainId),
    "run-latest.json",
  )
  if (!fs.existsSync(p)) {
    throw new Error(
      `Missing ${p}. Run finalize_ccip_testnet.sh first, or set CCIP_PASSPORT / CCIP_REGISTRY_MIRROR / CCIP_MIRROR_RECEIVER.`,
    )
  }
  const j = JSON.parse(fs.readFileSync(p, "utf8"))
  for (const t of j.transactions ?? []) {
    if (t.transactionType === "CREATE" && t.contractName === contractName) {
      return t.contractAddress
    }
  }
  throw new Error(`No CREATE ${contractName} in ${p}`)
}

const passport =
  process.env.CCIP_PASSPORT ??
  addrFromBroadcast("DeployCCIPCanonicalPassport", 43113, "CCIPRegistryPassport")
const mirror =
  process.env.CCIP_REGISTRY_MIRROR ??
  addrFromBroadcast("DeployCCIPMirrorStack", 421614, "RegistryMirror")
const receiver =
  process.env.CCIP_MIRROR_RECEIVER ??
  addrFromBroadcast("DeployCCIPMirrorStack", 421614, "CCIPRegistryMirrorReceiver")

const raw = fs.readFileSync(jsonPath, "utf8")
const data = JSON.parse(raw)
data.generatedAt = new Date().toISOString()
data.deployScript = "finalize_ccip_testnet + merge-ccip-addresses"
data.chains["43113"].CCIPRegistryPassport = passport
data.chains["421614"].RegistryMirror = mirror
data.chains["421614"].CCIPRegistryMirrorReceiver = receiver

fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + "\n", "utf8")
console.log("Updated", jsonPath)
console.log({ passport, mirror, receiver })
