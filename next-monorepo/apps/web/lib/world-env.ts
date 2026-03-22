import { VerificationLevel } from "@worldcoin/idkit"

/**
 * World ID / IDKit configuration from public env vars.
 * Values must match what you configure in the World Developer Portal and what
 * you used when deploying `CompetitorNFT` (`externalNullifierHash` for the same app + action).
 *
 * @see https://docs.world.org/world-id/overview
 * @see https://developer.worldcoin.org/
 * @see ../../docs/WORLD_ID.md
 */

/** Normalize env value: trim, strip one layer of ASCII quotes (common .env mistake). */
function normalizeEnvString(raw: string | undefined): string {
  if (!raw) return ""
  let s = raw.trim()
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim()
  }
  return s
}

function parseAppId(raw: string | undefined): `app_${string}` | undefined {
  const id = normalizeEnvString(raw)
  if (!id) return undefined
  if (!id.startsWith("app_")) return undefined
  return id as `app_${string}`
}

export type WorldAppIdStatus =
  | { state: "ok"; appId: `app_${string}` }
  | { state: "missing" }
  | { state: "invalid"; seen: string }

/** Use in UI to distinguish “unset” vs “set but rejected” (wrong prefix, quotes, etc.). */
export function getWorldAppIdStatus(): WorldAppIdStatus {
  const raw = process.env.NEXT_PUBLIC_WORLD_APP_ID
  const seen = normalizeEnvString(raw)
  const appId = parseAppId(raw)
  if (appId) return { state: "ok", appId }
  if (!seen) return { state: "missing" }
  return { state: "invalid", seen }
}

export type WorldIdKitPublicConfig = {
  /** `app_…` or `app_staging_…` from Developer Portal → App details */
  appId: `app_${string}` | undefined
  /** Action id — Portal “Action” / “Incognito action” name; must match contract intent */
  action: string
  /** Shown in World App when verifying (Portal “Description” or optional in IDKit) */
  actionDescription: string | undefined
  /** Orb-only for Competitor NFT (matches `GROUP_ID` on-chain) */
  verificationLevel: VerificationLevel
  /** Distinguish missing env vs invalid App ID for UI copy */
  appIdStatus: WorldAppIdStatus
}

export function getWorldIdKitPublicConfig(): WorldIdKitPublicConfig {
  const appIdStatus = getWorldAppIdStatus()
  return {
    appId: appIdStatus.state === "ok" ? appIdStatus.appId : undefined,
    action:
      process.env.NEXT_PUBLIC_WORLD_ACTION?.trim() || "ctfland-competitor",
    actionDescription: process.env.NEXT_PUBLIC_WORLD_ACTION_DESCRIPTION?.trim(),
    verificationLevel: VerificationLevel.Orb,
    appIdStatus,
  }
}
