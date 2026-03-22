import type { CredentialRole } from "@/lib/credential-message"

/** Recognized audit / bounty platforms (substring match on URL). */
const PLATFORM_PATTERNS = [
  "immunefi.com",
  "sherlock.xyz",
  "code4rena.com",
  "cantina.xyz",
  "codehawks.com",
] as const

export type CredentialProfilePayload = {
  /** Public profile URLs (Immunefi, Sherlock, Code4rena, Cantina, CodeHawks, etc.). */
  platformUrls: string[]
  /** Profile must include a Twitter / X link for OTP handoff. */
  twitterUrl: string
  /** Triage: count of High (or stronger) severities claimed on supported platforms. */
  highSeverityCount?: number
  /** Triage: documented USD earned from audits / bounties on those ecosystems. */
  auditUsdTotal?: number
  /** Judge: minimum one valid bug on a supported platform. */
  validBugCount?: number
}

function normalizeUrl(u: string): string {
  return u.trim().toLowerCase()
}

export function hasRecognizedPlatformUrl(urls: string[]): boolean {
  if (!Array.isArray(urls) || urls.length === 0) return false
  for (const raw of urls) {
    const u = normalizeUrl(raw)
    if (!u.startsWith("http://") && !u.startsWith("https://")) continue
    for (const p of PLATFORM_PATTERNS) {
      if (u.includes(p)) return true
    }
  }
  return false
}

export function hasTwitterUrl(twitterUrl: string): boolean {
  const u = normalizeUrl(twitterUrl)
  if (!u.startsWith("http://") && !u.startsWith("https://")) return false
  return u.includes("twitter.com") || u.includes("x.com")
}

export type CredentialValidationResult =
  | { ok: true }
  | { ok: false; reason: string }

export function validateCredentialProfile(
  role: CredentialRole,
  profile: unknown,
): CredentialValidationResult {
  if (!profile || typeof profile !== "object") {
    return { ok: false, reason: "Profile payload is required." }
  }
  const p = profile as Record<string, unknown>

  const platformUrls = p.platformUrls
  if (!Array.isArray(platformUrls) || platformUrls.some((x) => typeof x !== "string")) {
    return {
      ok: false,
      reason:
        "Provide platformUrls as a non-empty array of strings (Immunefi, Sherlock, Code4rena, Cantina, or CodeHawks links).",
    }
  }
  if (!hasRecognizedPlatformUrl(platformUrls as string[])) {
    return {
      ok: false,
      reason:
        "Include at least one profile URL on Immunefi, Sherlock, Code4rena, Cantina, or CodeHawks.",
    }
  }

  const twitterUrl = typeof p.twitterUrl === "string" ? p.twitterUrl : ""
  if (!hasTwitterUrl(twitterUrl)) {
    return {
      ok: false,
      reason:
        "A public Twitter / X profile link is required before verification. Add it to your platform profile, then retry. OTP is sent only after a valid X/Twitter URL is present.",
    }
  }

  if (role === "triage") {
    const high = Number(p.highSeverityCount)
    const usd = Number(p.auditUsdTotal)
    if (!Number.isFinite(high) || high < 1) {
      return {
        ok: false,
        reason: "Triage requires at least 1 High (or stronger) severity finding on a supported platform.",
      }
    }
    if (!Number.isFinite(usd) || usd < 10_000) {
      return {
        ok: false,
        reason: "Triage requires at least USD 10,000 in documented audit or bounty payouts on supported platforms.",
      }
    }
    return { ok: true }
  }

  const bugs = Number(p.validBugCount)
  if (!Number.isFinite(bugs) || bugs < 1) {
    return {
      ok: false,
      reason: "Judge verification requires at least one valid bug on a supported platform.",
    }
  }
  return { ok: true }
}
